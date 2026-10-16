// Read-only Docker client for the containers browser: lists containers and reads their stats, nothing else.
//
// DOCKER_HOST may be http://host:2375 (recommended: a socket proxy that only allows GET on containers) or
// unix:///var/run/docker.sock. Launchpad never sends anything but GET, but a raw socket mount still gives the
// container full Docker access if it were ever compromised, so prefer the proxy (see README).
import http from 'node:http';

const HOST = process.env.DOCKER_HOST || '';
const target = (() => {
  if (!HOST) return null;
  if (HOST.startsWith('unix://')) return { socketPath: HOST.slice(7) };
  const u = new URL(HOST.replace(/^tcp:/, 'http:'));
  return { host: u.hostname, port: Number(u.port) || 2375 };
})();

export const dockerEnabled = Boolean(target);

const get = path =>
  new Promise((resolve, reject) => {
    const req = http.request({ ...target, path, method: 'GET', timeout: 8000 }, res => {
      let body = '';
      res.on('data', c => (body += c));
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(`Docker ${path} → HTTP ${res.statusCode}`));
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('timeout', () => req.destroy(new Error('Docker API timed out')));
    req.on('error', reject);
    req.end();
  });

// CPU % needs two samples; with one-shot stats Docker leaves precpu empty, so we keep the previous sample ourselves.
const previous = new Map();

export const summarize = (c, s, prev, now) => {
  const cpuTotal = s?.cpu_stats?.cpu_usage?.total_usage;
  const sysTotal = s?.cpu_stats?.system_cpu_usage;
  const cpus = s?.cpu_stats?.online_cpus || s?.cpu_stats?.cpu_usage?.percpu_usage?.length || 1;
  let cpu = null;
  if (prev && cpuTotal != null && sysTotal != null && sysTotal > prev.sys) cpu = ((cpuTotal - prev.cpu) / (sysTotal - prev.sys)) * cpus * 100;
  const cache = s?.memory_stats?.stats?.inactive_file ?? s?.memory_stats?.stats?.total_inactive_file ?? s?.memory_stats?.stats?.cache ?? 0;
  const mem = s?.memory_stats?.usage != null ? Math.max(0, s.memory_stats.usage - cache) : null;
  const nets = Object.values(s?.networks || {});
  const rxTotal = nets.reduce((a, n) => a + n.rx_bytes, 0);
  const txTotal = nets.reduce((a, n) => a + n.tx_bytes, 0);
  const dt = prev ? (now - prev.t) / 1000 : 0;
  const io = (s?.blkio_stats?.io_service_bytes_recursive || []).reduce((a, e) => ((a[e.op?.toLowerCase()] = (a[e.op?.toLowerCase()] || 0) + e.value), a), {});
  return {
    cpu: cpu == null ? null : Math.max(0, Math.round(cpu * 10) / 10),
    mem,
    memLimit: s?.memory_stats?.limit ?? null,
    rx: prev && dt > 0 && nets.length ? Math.max(0, (rxTotal - prev.rx) / dt) : null,
    tx: prev && dt > 0 && nets.length ? Math.max(0, (txTotal - prev.tx) / dt) : null,
    rxTotal: nets.length ? rxTotal : null,
    txTotal: nets.length ? txTotal : null,
    blockRead: io.read ?? null,
    blockWrite: io.write ?? null,
    pids: s?.pids_stats?.current ?? null,
    sample: cpuTotal != null ? { t: now, cpu: cpuTotal, sys: sysTotal, rx: rxTotal, tx: txTotal } : null
  };
};

export const pool = async (list, size, fn) => {
  const out = new Array(list.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, list.length) }, async () => {
      while (i < list.length) {
        const n = i++;
        out[n] = await fn(list[n]).catch(() => null);
      }
    })
  );
  return out;
};

let cached = { at: 0, data: null };
let inflight = null;

async function collect() {
  const list = await get('/containers/json?all=1');
  const now = Date.now();
  const running = list.filter(c => c.State === 'running');
  const stats = await pool(running, 8, c => get(`/containers/${c.Id}/stats?stream=false&one-shot=true`));
  const byId = new Map(running.map((c, n) => [c.Id, stats[n]]));
  return list.map(c => {
    const name = (c.Names?.[0] || c.Id).replace(/^\//, '');
    const l = c.Labels || {};
    const s = byId.get(c.Id);
    const sum = s ? summarize(c, s, previous.get(c.Id), now) : null;
    if (sum?.sample) previous.set(c.Id, sum.sample);
    if (sum) delete sum.sample;
    return {
      id: c.Id.slice(0, 12),
      name,
      image: c.Image,
      state: c.State,
      status: c.Status,
      created: c.Created * 1000,
      project: l['coolify.projectName'] || null,
      environment: l['coolify.environmentName'] || null,
      resource: l['coolify.resourceName'] || l['coolify.serviceName'] || l['com.docker.compose.service'] || null,
      service: l['com.docker.compose.service'] || null,
      coolify: l['coolify.managed'] === 'true',
      ...(sum || {})
    };
  });
}

// Cached for a few seconds so several open browsers share one round of stats calls.
export async function containers() {
  if (cached.data && Date.now() - cached.at < 4000) return cached.data;
  inflight ||= collect().finally(() => (inflight = null));
  cached = { at: Date.now(), data: await inflight };
  return cached.data;
}
