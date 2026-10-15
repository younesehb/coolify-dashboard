// Host metrics from procfs, sampled every few seconds into a short in-memory history. Linux only, no dependencies.
//
// Inside a Docker container /proc/stat, /proc/meminfo, /proc/loadavg and /proc/uptime already describe the host, and
// statfs('/') reports the disk Docker's data lives on. Network is the exception: a container only sees its own
// interfaces. Mount the host's /proc read-only (e.g. `-v /proc:/host/proc:ro`) and set HOST_PROC=/host/proc to read
// the host network namespace through /proc/1/net/dev.
import { readFile, statfs } from 'node:fs/promises';
import { arch } from 'node:os';

const HOST_PROC = process.env.HOST_PROC || '';
const PROC = HOST_PROC || '/proc';
const DISK_PATH = process.env.DISK_PATH || '/';
const EVERY = 5000;
const KEEP = 120; // 10 minutes at 5 s
const VIRTUAL = /^(lo|veth|docker|br-|virbr|cni|flannel|cali|tun|tap|wg|tailscale|zt)/;

const history = [];
let last = null;
let latest = null;
let available = false;

export const cpuTimes = stat => {
  const [, ...n] = stat.split('\n')[0].trim().split(/\s+/);
  const v = n.map(Number);
  const idle = v[3] + (v[4] || 0);
  return { idle, total: v.reduce((a, b) => a + b, 0), cores: stat.split('\n').filter(l => /^cpu\d/.test(l)).length };
};

export const memInfo = txt => {
  const kb = k => Number(txt.match(new RegExp(`^${k}:\\s+(\\d+)`, 'm'))?.[1] || 0) * 1024;
  return { total: kb('MemTotal'), used: kb('MemTotal') - kb('MemAvailable'), swapTotal: kb('SwapTotal'), swapUsed: kb('SwapTotal') - kb('SwapFree') };
};

export const netTotals = txt => {
  let rx = 0;
  let tx = 0;
  for (const line of txt.split('\n').slice(2)) {
    const [name, rest] = line.split(':');
    if (!rest || VIRTUAL.test(name.trim())) continue;
    const f = rest.trim().split(/\s+/).map(Number);
    rx += f[0];
    tx += f[8];
  }
  return { rx, tx };
};

async function sample() {
  const netFile = HOST_PROC ? `${PROC}/1/net/dev` : null;
  const [stat, mem, load, up, net, fs] = await Promise.all([
    readFile(`${PROC}/stat`, 'utf8'),
    readFile(`${PROC}/meminfo`, 'utf8'),
    readFile(`${PROC}/loadavg`, 'utf8'),
    readFile(`${PROC}/uptime`, 'utf8'),
    netFile ? readFile(netFile, 'utf8').catch(() => null) : null,
    statfs(DISK_PATH).catch(() => null)
  ]);
  const now = { t: Date.now(), cpu: cpuTimes(stat), net: net ? netTotals(net) : null };
  const m = memInfo(mem);
  const point = { t: now.t, mem: m.used, cpu: null, rx: null, tx: null };
  if (last) {
    const dt = (now.t - last.t) / 1000;
    const total = now.cpu.total - last.cpu.total;
    point.cpu = total > 0 ? Math.max(0, Math.min(100, (1 - (now.cpu.idle - last.cpu.idle) / total) * 100)) : 0;
    if (now.net && last.net) {
      point.rx = Math.max(0, (now.net.rx - last.net.rx) / dt);
      point.tx = Math.max(0, (now.net.tx - last.net.tx) / dt);
    }
    history.push(point);
    if (history.length > KEEP) history.shift();
  }
  last = now;
  latest = {
    cores: now.cpu.cores,
    load: load.split(' ').slice(0, 3).map(Number),
    uptime: Number(up.split(' ')[0]),
    memTotal: m.total,
    memUsed: m.used,
    swapTotal: m.swapTotal,
    swapUsed: m.swapUsed,
    diskTotal: fs ? fs.blocks * fs.bsize : null,
    diskUsed: fs ? (fs.blocks - fs.bfree) * fs.bsize : null,
    network: Boolean(now.net)
  };
}

// Sample data for DEMO=true. Never reads the machine it runs on; the numbers describe an imaginary 12-core box.
const START = Date.now();
function demoTick(t = Date.now()) {
  const s = t / 1000;
  const prev = history.at(-1);
  const wave = (a, p) => a * Math.sin(s / p);
  history.push({
    t,
    cpu: Math.max(3, 22 + wave(12, 37) + wave(6, 11) + Math.random() * 6),
    mem: (19.2 + wave(1.2, 90) + Math.random() * 0.2) * 2 ** 30,
    rx: Math.max(2e4, (prev?.rx ?? 9e5) * (0.75 + Math.random() * 0.5) + (Math.random() < 0.08 ? 4e6 : 0)) % 9e6,
    tx: Math.max(1e4, (prev?.tx ?? 3e5) * (0.75 + Math.random() * 0.5) + (Math.random() < 0.06 ? 1.5e6 : 0)) % 4e6
  });
  if (history.length > KEEP) history.shift();
  latest = {
    cores: 12,
    load: [2.1 + wave(0.6, 41), 1.9 + wave(0.3, 97), 1.7 + wave(0.2, 233)].map(l => Math.round(l * 100) / 100),
    uptime: 3_456_789 + (t - START) / 1000,
    memTotal: 32 * 2 ** 30,
    memUsed: history.at(-1).mem,
    swapTotal: 8 * 2 ** 30,
    swapUsed: 0.6 * 2 ** 30,
    diskTotal: 2000e9,
    diskUsed: 734e9,
    network: true
  };
}

// Static facts about the machine, read once. The kernel is shared with containers, so /proc describes the host.
export const parseCpuModel = cpuinfo =>
  cpuinfo
    .match(/^model name\s*:\s*(.+)$/m)?.[1]
    .replace(/\s+/g, ' ')
    .replace(/\((R|TM)\)/g, '')
    .trim() ||
  cpuinfo.match(/^Hardware\s*:\s*(.+)$/m)?.[1].trim() ||
  null;
export const parseDistro = version => {
  const DISTROS = ['Ubuntu', 'Debian', 'Fedora', 'Red Hat', 'CentOS', 'Rocky', 'AlmaLinux', 'Alpine', 'Arch', 'openSUSE', 'SUSE', 'Amazon'];
  const found = version.match(new RegExp(`\\b(${DISTROS.join('|')})\\b`, 'i'))?.[1];
  const name = found ? DISTROS.find(d => d.toLowerCase() === found.toLowerCase()) : null;
  const release = version.match(/~(\d+\.\d+)/)?.[1];
  return name ? `${name}${release ? ` ${release}` : ''}` : null;
};

let system = null;
async function readSystem() {
  const read = f => readFile(`${PROC}/${f}`, 'utf8').catch(() => '');
  const [cpuinfo, version, kernel, host] = await Promise.all([read('cpuinfo'), read('version'), read('sys/kernel/osrelease'), read('sys/kernel/hostname')]);
  const hostname = host.trim();
  system = {
    // Inside a container the UTS hostname is the container id; SERVER_NAME or Coolify's server name replace it later.
    hostname: process.env.SERVER_NAME || (/^[0-9a-f]{12}$/.test(hostname) ? null : hostname || null),
    os: parseDistro(version) || 'Linux',
    kernel: kernel.trim() || null,
    arch: arch() === 'x64' ? 'x86_64' : arch() === 'arm64' ? 'arm64' : arch(),
    cpuModel: parseCpuModel(cpuinfo),
    virtual: /\bhypervisor\b/.test(cpuinfo)
  };
}

const DEMO_SYSTEM = {
  hostname: 'atlas',
  os: 'Ubuntu 24.04',
  kernel: '6.8.0-45-generic',
  arch: 'x86_64',
  cpuModel: 'AMD EPYC 7763 64-Core Processor',
  virtual: true,
  coolifyVersion: '4.0.0'
};

export async function startMetrics(demo) {
  if (demo) {
    system = DEMO_SYSTEM;
    const start = Date.now() - KEEP * EVERY;
    for (let i = 0; i < KEEP; i++) demoTick(start + i * EVERY);
    available = true;
    setInterval(() => demoTick(), EVERY).unref();
    return;
  }
  try {
    await readSystem();
    await sample();
    available = true;
    setInterval(() => sample().catch(() => {}), EVERY).unref();
    setTimeout(() => sample().catch(() => {}), 1000).unref(); // first CPU and network rates without waiting 5 s
  } catch {
    available = false; // not Linux, or /proc not readable
  }
}

export const metrics = extra => (available ? { available: true, interval: EVERY, ...latest, system: { ...system, ...extra }, history } : { available: false });
