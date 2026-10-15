// Tiny zero-dependency server: proxies the Coolify API (token stays server-side) and serves the built SPA.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash, timingSafeEqual } from 'node:crypto';
import { demoItems } from './demo.js';
import { metrics, startMetrics } from './metrics.js';

const COOLIFY_URL = (process.env.COOLIFY_URL || '').replace(/\/$/, '');
const COOLIFY_PUBLIC_URL = (process.env.COOLIFY_PUBLIC_URL || COOLIFY_URL).replace(/\/$/, '');
const TOKEN = process.env.COOLIFY_TOKEN;
const PORT = process.env.PORT || 3000;
const DIST = path.resolve('dist');
const DEMO = process.env.DEMO === 'true';
const ACTIONS_PASSWORD = process.env.ACTIONS_PASSWORD || (DEMO ? 'demo' : '');
const LOGO_BASE = 'https://raw.githubusercontent.com/coollabsio/coolify/v4.x';

if (!DEMO && (!COOLIFY_URL || !TOKEN)) console.warn('COOLIFY_URL and COOLIFY_TOKEN must be set (or DEMO=true to try it with sample data)');

// Lifecycle calls. Newer Coolify wants POST, older builds only answer GET.
const control = async p => {
  for (const method of ['POST', 'GET']) {
    const r = await fetch(`${COOLIFY_URL}/api/v1${p}`, {
      method,
      headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(20000)
    });
    if (r.status === 405 || (method === 'POST' && r.status === 404)) continue;
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(body.message || `Coolify ${p} → HTTP ${r.status}`), { status: r.status });
    return body;
  }
  throw new Error(`Coolify ${p} is not supported by this Coolify version`);
};

const ROUTES = {
  app: {
    redeploy: id => `/deploy?uuid=${id}&force=false`,
    restart: id => `/applications/${id}/restart`,
    stop: id => `/applications/${id}/stop`,
    start: id => `/applications/${id}/start`
  },
  service: {
    redeploy: id => `/services/${id}/restart?latest=true`,
    restart: id => `/services/${id}/restart`,
    stop: id => `/services/${id}/stop`,
    start: id => `/services/${id}/start`
  }
};

const digest = v => createHash('sha256').update(String(v)).digest();
const keyOk = k => DEMO || (Boolean(ACTIONS_PASSWORD) && timingSafeEqual(digest(k), digest(ACTIONS_PASSWORD)));
let failures = 0; // Global back-off on wrong passwords; add per-IP limits if this ever sees real traffic.

const readJson = req =>
  new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', c => {
      raw += c;
      if (raw.length > 2048) req.destroy();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw || '{}'));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });

const api = async p => {
  const r = await fetch(`${COOLIFY_URL}/api/v1${p}`, {
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(15000)
  });
  if (!r.ok) throw new Error(`Coolify ${p} → HTTP ${r.status}`);
  return r.json();
};

// Coolify fqdn convention: "https://a.com:3000" means container port 3000, not a public port.
const splitUrls = s =>
  (s || '')
    .split(',')
    .map(u => u.trim())
    .filter(Boolean)
    .map(u => {
      try {
        const x = new URL(u);
        return `${x.protocol}//${x.hostname}${x.pathname === '/' ? '' : x.pathname}`;
      } catch {
        return null;
      }
    })
    .filter(Boolean);

const appUrls = a => {
  if (a.fqdn) return splitUrls(a.fqdn);
  try {
    // docker-compose apps keep domains per compose service
    return Object.values(JSON.parse(a.docker_compose_domains || '{}')).flatMap(d => splitUrls(d.domain));
  } catch {
    return [];
  }
};

let templates = null; // service_type -> logo path, from Coolify's own template catalog
const serviceLogos = async () => {
  if (templates) return templates;
  try {
    const r = await fetch(`${LOGO_BASE}/templates/service-templates.json`, { signal: AbortSignal.timeout(8000) });
    const d = await r.json();
    templates = Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v.logo]));
  } catch {
    return {};
  }
  return templates;
};

let cache = { at: 0, data: null };
// Single 30 s in-memory cache; plenty for one instance.
async function loadApps() {
  if (cache.data && Date.now() - cache.at < 30_000) return cache.data;
  if (DEMO) {
    cache = {
      at: Date.now(),
      data: {
        instance: 'demo.coolify.example',
        coolifyUrl: 'https://coolify.io',
        owner: process.env.OWNER_NAME || '',
        actions: true,
        demo: true,
        items: demoItems()
      }
    };
    return cache.data;
  }
  const [apps, services, projects, logos] = await Promise.all([api('/applications'), api('/services'), api('/projects'), serviceLogos()]);
  const details = await Promise.all(projects.map(p => api(`/projects/${p.uuid}`).catch(() => ({ ...p, environments: [] }))));
  const envs = {};
  for (const p of details) for (const e of p.environments || []) envs[e.id] = { project: p.name, projectUuid: p.uuid, environment: e.name, envUuid: e.uuid };

  const parse = s => {
    const [st, h] = (s || 'unknown').split(':');
    return { state: st, health: h || null };
  };

  const items = [
    ...apps.map(a => {
      const e = envs[a.environment_id] || {};
      return {
        id: a.uuid,
        kind: 'app',
        name: a.name,
        description: a.description || '',
        urls: appUrls(a),
        ...parse(a.status),
        ...e,
        stack: a.build_pack,
        repo: a.git_repository && !a.git_repository.includes('://') ? `https://github.com/${a.git_repository}` : a.git_repository || null,
        branch: a.git_branch,
        updatedAt: a.updated_at,
        logo: null,
        manage: e.projectUuid ? `${COOLIFY_PUBLIC_URL}/project/${e.projectUuid}/environment/${e.envUuid}/application/${a.uuid}` : null
      };
    }),
    ...services.map(s => {
      const e = envs[s.environment_id] || {};
      const logo = logos[s.service_type];
      return {
        id: s.uuid,
        kind: 'service',
        name: s.name,
        description: s.description || '',
        urls: [...new Set((s.applications || []).flatMap(x => splitUrls(x.fqdn)))],
        ...parse(s.status),
        ...e,
        stack: s.service_type || 'compose',
        repo: null,
        updatedAt: s.updated_at,
        logo: logo ? `https://cdn.jsdelivr.net/gh/coollabsio/coolify@v4.x/public/${logo}` : null,
        manage: e.projectUuid ? `${COOLIFY_PUBLIC_URL}/project/${e.projectUuid}/environment/${e.envUuid}/service/${s.uuid}` : null
      };
    })
  ].map(({ projectUuid, envUuid, ...rest }) => rest);

  let instance = COOLIFY_PUBLIC_URL;
  try {
    instance = new URL(COOLIFY_PUBLIC_URL).hostname;
  } catch {}
  cache = {
    at: Date.now(),
    data: { instance, coolifyUrl: COOLIFY_PUBLIC_URL, owner: process.env.OWNER_NAME || '', actions: Boolean(ACTIONS_PASSWORD), items }
  };
  return cache.data;
}

// Icon resolver: only for URLs belonging to known apps (no open SSRF).
const icons = new Map();
async function resolveIcon(origin) {
  if (icons.has(origin)) return icons.get(origin);
  const candidates = [];
  try {
    const html = await (await fetch(origin, { signal: AbortSignal.timeout(5000), redirect: 'follow' })).text();
    const links = html.match(/<link\b[^>]*>/gi) || [];
    const pick = re =>
      links
        .filter(l => re.test(l))
        .map(l => (l.match(/href=["']([^"']+)["']/i) || [])[1])
        .filter(Boolean);
    candidates.push(...pick(/rel=["'][^"']*apple-touch-icon/i), ...pick(/rel=["'](?:shortcut )?icon["']/i));
  } catch {}
  candidates.push('/apple-touch-icon.png', '/favicon.svg', '/favicon.ico');
  for (const c of candidates) {
    try {
      const u = new URL(c, origin).href;
      const r = await fetch(u, { signal: AbortSignal.timeout(5000) });
      const type = r.headers.get('content-type') || '';
      if (r.ok && (type.startsWith('image/') || /\.(ico|png|svg)$/.test(u))) {
        const icon = { type: type.startsWith('image/') ? type : 'image/x-icon', body: Buffer.from(await r.arrayBuffer()) };
        if (icon.body.length > 0) {
          icons.set(origin, icon);
          return icon;
        }
      }
    } catch {}
  }
  icons.set(origin, null);
  return null;
}

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2'
};

// Images may come from anywhere (custom icons and wallpapers); everything else stays same-origin.
const SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'self'; img-src * data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer'
};

const send = (res, code, body, type = 'application/json', extra = {}) => {
  res.writeHead(code, { 'Content-Type': type, ...SECURITY_HEADERS, ...extra });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname === '/api/action' && req.method === 'POST') {
      if (!ACTIONS_PASSWORD) return send(res, 403, { error: 'Actions are turned off. Set ACTIONS_PASSWORD on the server.' });
      if (!keyOk(req.headers['x-launchpad-key'] || '')) {
        failures++;
        await new Promise(r => setTimeout(r, Math.min(failures, 10) * 400));
        return send(res, 401, { error: 'Wrong actions password' });
      }
      failures = 0;
      const { id, action } = await readJson(req);
      const { items } = await loadApps();
      const item = items.find(i => i.id === id);
      const route = item && ROUTES[item.kind]?.[action];
      if (!route) return send(res, 400, { error: 'Unknown app or action' });
      // Demo actions pretend to deploy for a few seconds.
      const out = DEMO ? { deployment_uuid: `demo${Date.now()}`, message: 'Demo deployment queued' } : await control(route(item.id));
      cache.at = 0;
      return send(res, 200, {
        deploymentId: out.deployment_uuid || out.deployments?.[0]?.deployment_uuid || null,
        message: out.message || out.deployments?.[0]?.message || 'Done'
      });
    }
    const dep = url.pathname.match(/^\/api\/deployment\/([a-z0-9]{8,40})$/);
    if (dep) {
      if (DEMO) return send(res, 200, { status: Date.now() - Number(dep[1].slice(4)) > 6000 ? 'finished' : 'in_progress' });
      const d = await api(`/deployments/${dep[1]}`);
      return send(res, 200, { status: d.status });
    }
    if (url.pathname === '/api/metrics') return send(res, 200, metrics(), 'application/json', { 'Cache-Control': 'no-store' });
    if (url.pathname === '/api/apps') {
      if (url.searchParams.has('fresh')) cache.at = 0;
      return send(res, 200, await loadApps());
    }
    if (url.pathname === '/api/icon') {
      const { items } = await loadApps();
      const item = items.find(i => i.id === url.searchParams.get('id'));
      if (!item?.urls[0] || DEMO) return send(res, 404, { error: 'no url' });
      const icon = await resolveIcon(new URL(item.urls[0]).origin);
      if (!icon) return send(res, 404, { error: 'no icon' }, 'application/json', { 'Cache-Control': 'max-age=3600' });
      return send(res, 200, icon.body, icon.type, { 'Cache-Control': 'max-age=86400' });
    }
    if (url.pathname.startsWith('/api/')) return send(res, 404, { error: 'not found' });

    let file = path.join(DIST, decodeURIComponent(url.pathname));
    if (!file.startsWith(DIST + path.sep)) return send(res, 403, 'forbidden', 'text/plain');
    let body;
    try {
      body = await readFile(file);
    } catch {
      file = path.join(DIST, 'index.html');
      body = await readFile(file);
    }
    const immutable = url.pathname.startsWith('/assets/');
    return send(res, 200, body, MIME[path.extname(file)] || 'application/octet-stream', {
      'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache'
    });
  } catch (e) {
    console.error(e);
    return send(res, 502, { error: e.message });
  }
});

startMetrics(DEMO);
server.listen(PORT, () => console.log(`Launchpad on :${PORT} → ${DEMO ? 'demo data' : COOLIFY_URL}`));
// Docker sends SIGTERM on stop; close cleanly instead of waiting to be killed.
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => server.close(() => process.exit(0)));
