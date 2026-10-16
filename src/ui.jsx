import { useEffect, useRef, useState } from 'react';
import { animate } from 'motion/react';

const GENERIC = new Set(['main', 'tst', 'app', 'web', 'prod', 'production']);

export const status = i => {
  if (i.kind === 'link') return { key: 'link', label: 'Link', dot: '', rank: 0 };
  if (i.state === 'running' && i.health !== 'unhealthy') return { key: 'up', label: 'Running', dot: 'bg-up', rank: 0 };
  if (i.state === 'running' || i.state === 'degraded')
    return { key: 'warn', label: i.state === 'degraded' ? 'Degraded' : 'Unhealthy', dot: 'bg-warn', rank: 1 };
  return { key: 'down', label: i.state === 'exited' ? 'Stopped' : i.state || 'Unknown', dot: 'bg-down', rank: 2 };
};
export const isUp = i => status(i).key === 'up';
export const host = u => u.replace(/^https?:\/\//, '');
const hue = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 11);

export const nameOf = (i, overrides = {}) => {
  if (overrides[i.id]?.name) return overrides[i.id].name;
  if (!GENERIC.has(i.name) || !i.project) return i.name;
  return i.environment && i.environment !== 'production' ? `${i.project} ${i.environment}` : i.project;
};

export const matches = (i, q, overrides) => {
  const n = q.trim().toLowerCase();
  return !n || [nameOf(i, overrides), i.name, i.description, i.project, i.stack, ...i.urls].join(' ').toLowerCase().includes(n);
};

export function AppIcon({ item, overrides, size = 76, className = '' }) {
  const custom = overrides?.[item.id]?.icon;
  const sources = [custom, item.logo, ...(item.icons || []), item.urls.length && item.kind !== 'link' ? `/api/icon?id=${item.id}` : null].filter(Boolean);
  const key = sources.join('|');
  const [i, setI] = useState(0);
  useEffect(() => setI(0), [key]);
  const name = nameOf(item, overrides);
  const h = hue(name);
  const fallback = i >= sources.length;
  return (
    <div
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-[23%] shadow-[0_6px_18px_-6px_rgb(0_0_0/0.6),inset_0_1px_0_rgb(255_255_255/0.35)] ${className}`}
      style={{
        width: size,
        height: size,
        background: fallback ? `linear-gradient(160deg, hsl(${h} 62% 58%), hsl(${(h + 28) % 360} 68% 42%))` : 'linear-gradient(180deg, #fff, #ececf0)'
      }}
    >
      {fallback ? (
        <span className="font-semibold text-white drop-shadow-sm" style={{ fontSize: size * 0.42 }}>
          {name.slice(0, 1).toUpperCase()}
        </span>
      ) : (
        <img
          src={sources[i]}
          alt=""
          draggable="false"
          onError={() => setI(n => n + 1)}
          className={custom ? 'size-full object-cover' : 'size-[62%] object-contain'}
        />
      )}
    </div>
  );
}

// Counts that roll to their new value instead of snapping.
export function Num({ value }) {
  const ref = useRef(null);
  const from = useRef(0);
  useEffect(() => {
    const c = animate(from.current, value, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: v => ref.current && (ref.current.textContent = Math.round(v))
    });
    from.current = value;
    return () => c.stop();
  }, [value]);
  return <span ref={ref}>0</span>;
}

export const GithubMark = props => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
  </svg>
);
