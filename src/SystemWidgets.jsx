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

export const systemCaption = m => `System · ${m.cores} cores · up ${duration(m.uptime)}`;

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
