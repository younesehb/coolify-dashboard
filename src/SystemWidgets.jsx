import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowDown, ArrowUp, Cpu, HardDrive, MemoryStick } from 'lucide-react';

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
export const bytes = (n, digits = 1) => {
  if (n == null || !Number.isFinite(n)) return '—';
  let i = 0;
  while (n >= 1024 && i < UNITS.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n >= 100 || i === 0 ? 0 : digits)} ${UNITS[i]}`;
};
export const rate = n => (n == null ? '—' : `${bytes(n)}/s`);
const pct = (used, total) => (total ? Math.round((used / total) * 100) : 0);
const duration = s => {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  return d ? `${d} d ${h} h` : `${h} h ${Math.floor((s % 3600) / 60)} min`;
};

// Polls /api/metrics while any system widget is on and the tab is visible.
export function useMetrics(enabled) {
  const [m, setM] = useState(null);
  useEffect(() => {
    if (!enabled) return;
    let stop = false;
    const tick = async () => {
      if (document.hidden) return;
      try {
        const d = await (await fetch('/api/metrics')).json();
        if (!stop) setM(d);
      } catch {}
    };
    tick();
    const t = setInterval(tick, 5000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      stop = true;
      clearInterval(t);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [enabled]);
  return m;
}

function Ring({ value, size = 50 }) {
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(255 255 255 / 0.22)" strokeWidth="4" />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - Math.min(100, value) / 100) }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      />
    </svg>
  );
}

function Gauge({ icon: Icon, label, value, detail }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-[26px] bg-white/10 py-2.5 shadow-[inset_0_1px_0_rgb(255_255_255/0.25)]">
      <div className="relative grid place-items-center">
        <Ring value={value} />
        <Icon className="absolute size-[17px]" strokeWidth={2} />
      </div>
      <span className="text-[12px] text-white/70">{label}</span>
      <span className="text-[14px] font-semibold tabular-nums" title={detail}>
        {value}%
      </span>
    </div>
  );
}

export function SystemGauges({ m }) {
  const cpu = Math.round(m.history.at(-1)?.cpu ?? 0);
  return (
    <div className="flex h-full gap-2">
      <Gauge icon={Cpu} label="CPU" value={cpu} detail={`${m.cores} cores · load ${m.load.map(l => l.toFixed(2)).join(' ')}`} />
      <Gauge icon={MemoryStick} label="Memory" value={pct(m.memUsed, m.memTotal)} detail={`${bytes(m.memUsed)} of ${bytes(m.memTotal)}`} />
      {m.diskTotal != null && (
        <Gauge icon={HardDrive} label="Disk" value={pct(m.diskUsed, m.diskTotal)} detail={`${bytes(m.diskUsed)} of ${bytes(m.diskTotal)}`} />
      )}
    </div>
  );
}

export const systemCaption = () => 'System';

// "4.6 GB / 8.2 GB, 3.6 GB left" card used for memory and storage.
export function UsageCard({ title, used, total, footnote }) {
  return (
    <div className="px-2 py-1">
      <p className="text-[13px] text-white/75">{title}</p>
      <p className="mt-0.5 text-[28px] font-semibold leading-none tabular-nums">
        {bytes(used)}
        <span className="text-[15px] font-medium text-white/65"> / {bytes(total)}</span>
      </p>
      <p className="mt-4 text-[13px] text-white/75">{footnote ?? `${bytes(total - used)} left`}</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/25">
        <motion.div
          className="h-full rounded-full bg-white"
          initial={{ width: 0 }}
          animate={{ width: `${pct(used, total)}%` }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
}

function Sparkline({ points, keyName, className, fill }) {
  const values = points.map(p => p[keyName] ?? 0);
  const max = Math.max(1, ...points.map(p => Math.max(p.rx ?? 0, p.tx ?? 0)));
  const w = 100;
  const h = 40;
  const step = w / Math.max(1, values.length - 1);
  const line = values.map((v, i) => `${i ? 'L' : 'M'}${(i * step).toFixed(2)},${(h - (v / max) * (h - 2)).toFixed(2)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={`absolute inset-0 size-full ${className}`} aria-hidden="true">
      {fill && <path d={`${line} L${w},${h} L0,${h} Z`} fill="currentColor" opacity="0.18" />}
      <path d={line} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

export function NetworkCard({ m }) {
  if (!m.network)
    return (
      <div className="grid h-full place-items-center px-4 text-center text-[13px] text-white/80">
        Host network traffic needs the host's /proc mounted read-only. See "System metrics" in the README.
      </div>
    );
  const pts = m.history.filter(p => p.rx != null);
  const last = pts.at(-1) || {};
  return (
    <div className="relative flex h-full flex-col justify-between px-2 py-1">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 top-12">
        <Sparkline points={pts} keyName="rx" className="text-white" fill />
        <Sparkline points={pts} keyName="tx" className="text-white/55" />
      </div>
      <div className="relative flex items-start gap-6">
        <div>
          <p className="flex items-center gap-1 text-[13px] text-white/75">
            <ArrowDown className="size-3.5" /> In
          </p>
          <p className="text-[22px] font-semibold leading-tight tabular-nums">{rate(last.rx)}</p>
        </div>
        <div>
          <p className="flex items-center gap-1 text-[13px] text-white/75">
            <ArrowUp className="size-3.5" /> Out
          </p>
          <p className="text-[22px] font-semibold leading-tight text-white/85 tabular-nums">{rate(last.tx)}</p>
        </div>
        <p className="ml-auto text-[11px] text-white/60">last {Math.round((pts.length * m.interval) / 60000) || 1} min</p>
      </div>
    </div>
  );
}

const serverName = m => m.system?.hostname || m.system?.serverName || 'Server';
const platform = m => `${m.system?.os || 'Linux'} · ${m.system?.arch || ''}`;
const shortCpu = s =>
  (s || '')
    .replace(/\s*\d+-Core Processor/i, '')
    .replace(/\s*CPU @.*/i, '')
    .replace(/\s+Processor$/i, '');

function ServerGlyph({ size = 52 }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-[23%] shadow-[0_6px_18px_-6px_rgb(0_0_0/0.6),inset_0_1px_0_rgb(255_255_255/0.35)]"
      style={{ width: size, height: size, background: 'linear-gradient(160deg, #3a3550, #16141f)' }}
    >
      <svg viewBox="0 0 24 24" width={size * 0.56} height={size * 0.56} fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
        <rect x="3" y="3.5" width="18" height="7" rx="2" />
        <rect x="3" y="13.5" width="18" height="7" rx="2" />
        <circle cx="7" cy="7" r="0.9" fill="#7CE38B" stroke="none" />
        <circle cx="7" cy="17" r="0.9" fill="#7CE38B" stroke="none" />
        <path d="M11 7h6M11 17h6" opacity="0.55" />
      </svg>
    </span>
  );
}

export function ServerCard({ m, onOpen }) {
  const s = m.system || {};
  return (
    <button type="button" onClick={onOpen} className="flex h-full w-full flex-col justify-between rounded-[20px] px-2 py-1 text-left outline-none">
      <span className="flex items-center gap-3">
        <ServerGlyph size={44} />
        <span className="min-w-0">
          <span className="block truncate text-[19px] font-semibold leading-tight">{serverName(m)}</span>
          <span className="block truncate text-[12px] text-white/70">{platform(m)}</span>
        </span>
      </span>
      <span className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 text-[12px] text-white/80">
        <span className="col-span-2 truncate" title={s.cpuModel || ''}>
          {shortCpu(s.cpuModel) || 'CPU'} · {m.cores} cores
        </span>
        <span className="truncate">
          {bytes(m.memTotal, 0)} RAM · {bytes(m.diskTotal, 0)} disk
        </span>
        <span className="text-right">Up {duration(m.uptime)}</span>
      </span>
    </button>
  );
}

// macOS "About This Mac", for the server.
export function AboutServer({ m, coolifyUrl, onClose }) {
  const s = m.system || {};
  useEffect(() => {
    const k = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  const rows = [
    ['Name', serverName(m)],
    ['Operating system', s.os],
    ['Kernel', s.kernel],
    ['Architecture', s.arch],
    ['Processor', s.cpuModel],
    ['Cores', m.cores],
    ['Platform', s.virtual ? 'Virtual machine' : 'Bare metal'],
    ['Memory', `${bytes(m.memUsed)} used of ${bytes(m.memTotal)}`],
    m.swapTotal ? ['Swap', `${bytes(m.swapUsed)} used of ${bytes(m.swapTotal)}`] : null,
    m.diskTotal != null ? ['Disk', `${bytes(m.diskUsed)} used of ${bytes(m.diskTotal)}`] : null,
    ['Uptime', duration(m.uptime)],
    ['Load average', m.load.map(l => l.toFixed(2)).join('  ')],
    s.coolifyVersion ? ['Coolify', s.coolifyVersion] : null
  ].filter(r => r && r[1] != null && r[1] !== '');
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-center bg-black/35 px-4 backdrop-blur-sm"
      onPointerDown={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        role="dialog"
        aria-label="About this server"
        initial={{ opacity: 0, scale: 0.94, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
        className="glass glass-dark w-full max-w-md rounded-[30px] p-7 text-center"
      >
        <div className="flex justify-center">
          <ServerGlyph size={92} />
        </div>
        <h2 className="mt-4 text-[26px] font-semibold tracking-tight">{serverName(m)}</h2>
        <p className="text-[14px] text-white/65">{platform(m)}</p>
        <dl className="mt-6 grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-2 text-left text-[13px]">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-right text-white/55">{k}</dt>
              <dd className="truncate tabular-nums" title={String(v)}>
                {v}
              </dd>
            </div>
          ))}
        </dl>
        <div className="mt-7 flex justify-center gap-2">
          {coolifyUrl && (
            <a href={coolifyUrl} target="_blank" rel="noreferrer" className="rounded-full bg-white/12 px-4 py-2 text-[13px] font-medium hover:bg-white/20">
              Open Coolify
            </a>
          )}
          <button onClick={onClose} className="rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-black hover:bg-white/90">
            Done
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
