import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowDown, ArrowUp, ChevronDown, Database, Layers, Link2, Rocket, Search, Server, Upload, X } from 'lucide-react';
import { bytes, rate } from './SystemWidgets';
import { AppIcon, nameOf } from './ui';
import { shrinkImage } from './prefs';

// Polls a JSON endpoint while `enabled` and the tab is visible.
export function usePoll(url, enabled, every) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!enabled) return;
    let stop = false;
    const tick = async () => {
      if (document.hidden) return;
      try {
        const d = await (await fetch(url)).json();
        if (!stop) setData(d);
      } catch {}
    };
    tick();
    const t = setInterval(tick, every);
    document.addEventListener('visibilitychange', tick);
    return () => {
      stop = true;
      clearInterval(t);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [url, enabled, every]);
  return data;
}

const ago = iso => {
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (!Number.isFinite(s)) return '';
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.round(s / 60)} min`;
  if (s < 86400) return `${Math.round(s / 3600)} h`;
  return `${Math.round(s / 86400)} d`;
};

const DEPLOY = {
  finished: { dot: 'bg-up', label: 'Deployed' },
  failed: { dot: 'bg-down', label: 'Failed' },
  in_progress: { dot: 'bg-warn animate-pulse', label: 'Building' },
  queued: { dot: 'bg-white/60', label: 'Queued' }
};
const deployState = s => DEPLOY[s] || (String(s).startsWith('cancel') ? { dot: 'bg-white/40', label: 'Cancelled' } : { dot: 'bg-white/40', label: s });

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-2.5 py-1.5 shadow-[inset_0_1px_0_rgb(255_255_255/0.2)]">
      <Icon className="size-3.5 shrink-0 text-white/75" />
      <span className="min-w-0 flex-1 truncate text-[12px] text-white/75">{label}</span>
      <span className="text-[13px] font-semibold tabular-nums">{value ?? '—'}</span>
    </div>
  );
}

export function CoolifyCard({ stats, up, total }) {
  return (
    <div className="flex h-full flex-col gap-2 px-1">
      <div className="flex items-baseline justify-between px-1">
        <p className="text-[24px] font-semibold leading-none tabular-nums">
          {up}
          <span className="text-[14px] font-medium text-white/65"> / {total} running</span>
        </p>
        {stats?.version && <span className="text-[11px] text-white/60">v{stats.version}</span>}
      </div>
      <div className="grid flex-1 grid-cols-2 gap-1.5">
        <Stat icon={Layers} label="Projects" value={stats?.projects} />
        <Stat icon={Server} label="Servers" value={stats?.servers?.length} />
        <Stat icon={Rocket} label="Apps" value={stats?.counts?.apps} />
        <Stat icon={Database} label="Databases" value={stats?.counts?.databases} />
      </div>
    </div>
  );
}

export function DeploymentsCard({ stats }) {
  const rows = [...(stats?.running || []), ...(stats?.recent || [])].slice(0, 4);
  if (!stats) return <p className="grid h-full place-items-center text-[13px] text-white/70">Loading deployments…</p>;
  if (!rows.length) return <p className="grid h-full place-items-center text-[13px] text-white/70">No deployments yet</p>;
  return (
    <ul className="space-y-0.5 px-1">
      {rows.map(d => {
        const s = deployState(d.status);
        return (
          <li key={d.id} className="flex items-center gap-2 rounded-xl px-1.5 py-1 text-[12px]" title={`${s.label}${d.commit ? ` · ${d.commit}` : ''}`}>
            <span className={`size-2 shrink-0 rounded-full ${s.dot}`} />
            <span className="shrink-0 font-medium text-[13px]">{d.app}</span>
            <span className="min-w-0 flex-1 truncate text-white/60">{d.commit || s.label}</span>
            <span className="shrink-0 tabular-nums text-white/60">{ago(d.at)}</span>
          </li>
        );
      })}
    </ul>
  );
}

// Coolify names containers <uuid>-<suffix> (apps), <service>-<uuid> (services) or <uuid> (databases).
export const owns = (item, c) => new RegExp(`(^|-)${item.id.replace(/[^a-z0-9-]/gi, '')}(-|$)`).test(c.name);

const prettyName = c => (c.resource ? `${c.resource}${c.service && c.service !== c.resource ? ` · ${c.service}` : ''}` : c.name);

export function ContainersCard({ data, onOpen }) {
  const list = (data?.containers || []).filter(c => c.state === 'running');
  const top = [...list].sort((a, b) => (b.cpu ?? 0) - (a.cpu ?? 0)).slice(0, 3);
  return (
    <button type="button" onClick={onOpen} className="flex h-full w-full flex-col rounded-[20px] px-1 text-left outline-none">
      <span className="flex items-baseline justify-between px-1">
        <span className="text-[13px] text-white/75">
          <span className="text-[20px] font-semibold text-white tabular-nums">{list.length}</span> running
        </span>
        <span className="text-[11px] text-white/60">Top CPU · Browse all</span>
      </span>
      <span className="mt-1.5 space-y-1">
        {top.map(c => (
          <span key={c.id} className="flex items-center gap-2 px-1 text-[12px]">
            <span className="min-w-0 flex-1 truncate">{prettyName(c)}</span>
            <span className="w-14 overflow-hidden rounded-full bg-white/20">
              <span className="block h-1.5 rounded-full bg-white" style={{ width: `${Math.min(100, c.cpu ?? 0)}%` }} />
            </span>
            <span className="w-12 text-right tabular-nums text-white/80">{c.cpu == null ? '…' : `${c.cpu}%`}</span>
          </span>
        ))}
      </span>
    </button>
  );
}

function Bar({ value, max }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0;
  return (
    <span className="mt-1 block h-1 overflow-hidden rounded-full bg-white/15">
      <motion.span className="block h-full rounded-full bg-white/85" animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} />
    </span>
  );
}

const SORTS = [
  ['cpu', 'CPU', c => c.cpu ?? -1],
  ['mem', 'Memory', c => c.mem ?? -1],
  ['net', 'Network', c => (c.rx ?? 0) + (c.tx ?? 0)],
  ['name', 'Name', null]
];

// Full-screen browser of every container with live stats.
export function ContainersView({ data, items, overrides, onClose }) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('cpu');
  const [open, setOpen] = useState(null);
  const [grouped, setGrouped] = useState(false);
  useEffect(() => {
    const k = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  const all = data?.containers || [];
  const owner = c => items.find(i => owns(i, c));
  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    const list = all.filter(c => !n || [c.name, c.image, c.resource, c.project, c.service].join(' ').toLowerCase().includes(n));
    const key = SORTS.find(s => s[0] === sort)?.[2];
    return list.sort((a, b) => {
      if (a.state !== b.state) return a.state === 'running' ? -1 : 1;
      return key ? key(b) - key(a) : prettyName(a).localeCompare(prettyName(b));
    });
  }, [all, q, sort]);
  const groups = useMemo(() => {
    if (!grouped) return [['', rows]];
    const m = new Map();
    for (const c of rows) m.set(c.project || 'Other', [...(m.get(c.project || 'Other') || []), c]);
    return [...m];
  }, [rows, grouped]);

  const running = all.filter(c => c.state === 'running');
  const totalMem = running.reduce((a, c) => a + (c.mem || 0), 0);
  const totalCpu = running.reduce((a, c) => a + (c.cpu || 0), 0);
  const maxMem = Math.max(1, ...running.map(c => c.mem || 0));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 grid place-items-center bg-black/35 p-3 backdrop-blur-sm sm:p-6"
      onPointerDown={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        role="dialog"
        aria-label="Containers"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        className="glass glass-dark flex h-[min(88vh,900px)] w-full max-w-5xl flex-col overflow-hidden rounded-[30px] !bg-[rgb(26_26_31/0.92)]"
      >
        <header className="flex flex-wrap items-center gap-3 border-b border-white/10 px-5 py-4 sm:px-6">
          <div className="mr-auto">
            <h2 className="text-[20px] font-semibold tracking-tight">Containers</h2>
            <p className="text-[12px] text-white/60 tabular-nums">
              {running.length} running · {all.length - running.length} stopped · {totalCpu.toFixed(1)}% CPU · {bytes(totalMem)} memory
            </p>
          </div>
          <label className="flex min-w-0 flex-1 basis-48 items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 sm:flex-none sm:basis-56">
            <Search className="size-4 text-white/60" />
            <input
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Filter containers"
              className="w-full bg-transparent text-[13px] outline-none placeholder:text-white/45"
            />
          </label>
          <div className="flex rounded-full bg-white/10 p-0.5">
            {SORTS.map(([k, label]) => (
              <button key={k} onClick={() => setSort(k)} className="relative rounded-full px-2.5 py-1 text-[12px] font-medium">
                {sort === k && (
                  <motion.span
                    layoutId="c-sort"
                    className="absolute inset-0 rounded-full bg-white/25"
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                  />
                )}
                <span className="relative">{label}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setGrouped(g => !g)}
            aria-pressed={grouped}
            className={`rounded-full px-3 py-1.5 text-[12px] font-medium ${grouped ? 'bg-white text-black' : 'bg-white/10'}`}
          >
            By project
          </button>
          <button onClick={onClose} aria-label="Close" className="grid size-8 place-items-center rounded-full bg-white/10 hover:bg-white/20">
            <X className="size-4" />
          </button>
        </header>

        <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)] gap-4 px-6 pb-1 pt-3 text-[11px] text-white/50 md:grid">
          <span>Container</span>
          <span>CPU</span>
          <span>Memory</span>
          <span>Network</span>
          <span>Status</span>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-3 pb-4 sm:px-4">
          {!data && <p className="p-8 text-center text-white/60">Reading containers…</p>}
          {data && !rows.length && <p className="p-8 text-center text-white/60">No container matches “{q}”.</p>}
          {groups.map(([g, list]) => (
            <section key={g || 'all'}>
              {g && <h3 className="px-3 pb-1 pt-4 text-[12px] font-semibold text-white/60">{g}</h3>}
              <ul>
                {list.map(c => {
                  const it = owner(c);
                  const up = c.state === 'running';
                  const health = /unhealthy/.test(c.status) ? 'bg-warn' : up ? 'bg-up' : 'bg-down';
                  const expanded = open === c.id;
                  return (
                    <motion.li
                      key={c.id}
                      layout="position"
                      transition={{ type: 'spring', stiffness: 420, damping: 38 }}
                      className="rounded-2xl hover:bg-white/[0.06]"
                    >
                      <button
                        onClick={() => setOpen(expanded ? null : c.id)}
                        className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-3 py-2.5 text-left md:grid-cols-[minmax(0,1.6fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)]"
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="relative shrink-0">
                            {it ? (
                              <AppIcon item={it} overrides={overrides} size={32} />
                            ) : (
                              <span className="grid size-8 place-items-center rounded-[23%] bg-white/10 text-[11px]">
                                {prettyName(c).slice(0, 1).toUpperCase()}
                              </span>
                            )}
                            <span className={`absolute -right-0.5 -top-0.5 size-2.5 rounded-full ring-2 ring-[rgb(26_26_31)] ${health}`} />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-[14px] font-medium">
                              {it ? nameOf(it, overrides) + (c.service && c.service !== it.name ? ` · ${c.service}` : '') : prettyName(c)}
                            </span>
                            <span className="block truncate font-mono text-[11px] text-white/50">{c.image}</span>
                          </span>
                        </span>
                        <ChevronDown className={`size-4 text-white/50 transition-transform md:hidden ${expanded ? 'rotate-180' : ''}`} />
                        <span className="text-[12px] tabular-nums">
                          {up ? (c.cpu == null ? '…' : `${c.cpu}%`) : '—'}
                          {up && <Bar value={c.cpu ?? 0} max={100} />}
                        </span>
                        <span className="text-[12px] tabular-nums">
                          {up ? bytes(c.mem) : '—'}
                          {up && <Bar value={c.mem ?? 0} max={maxMem} />}
                        </span>
                        <span className="flex gap-3 text-[12px] tabular-nums text-white/85">
                          {up ? (
                            <>
                              <span className="inline-flex items-center gap-0.5">
                                <ArrowDown className="size-3" />
                                {rate(c.rx)}
                              </span>
                              <span className="inline-flex items-center gap-0.5 text-white/65">
                                <ArrowUp className="size-3" />
                                {rate(c.tx)}
                              </span>
                            </>
                          ) : (
                            '—'
                          )}
                        </span>
                        <span className="truncate text-[12px] text-white/65">{c.status}</span>
                      </button>
                      {expanded && (
                        <motion.dl
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="grid grid-cols-2 gap-x-6 gap-y-1 px-14 pb-3 text-[12px] sm:grid-cols-4"
                        >
                          {[
                            ['Container', c.name],
                            ['ID', c.id],
                            ['Project', [c.project, c.environment].filter(Boolean).join(' / ') || '—'],
                            ['Processes', c.pids ?? '—'],
                            ['Memory limit', c.memLimit ? bytes(c.memLimit) : '—'],
                            ['Network total', c.rxTotal != null ? `↓ ${bytes(c.rxTotal)} · ↑ ${bytes(c.txTotal)}` : '—'],
                            ['Disk I/O', c.blockRead != null ? `R ${bytes(c.blockRead)} · W ${bytes(c.blockWrite)}` : '—'],
                            ['Created', new Date(c.created).toLocaleDateString()]
                          ].map(([k, v]) => (
                            <div key={k} className="min-w-0">
                              <dt className="text-white/45">{k}</dt>
                              <dd className="truncate font-mono text-[11px]" title={String(v)}>
                                {v}
                              </dd>
                            </div>
                          ))}
                        </motion.dl>
                      )}
                    </motion.li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// Live stats for one app's containers, shown inside its peek card.
export function AppContainers({ item, data }) {
  const list = (data?.containers || []).filter(c => owns(item, c));
  if (!list.length) return null;
  return (
    <div className="border-t border-white/10 px-3 py-2">
      <p className="mb-1 text-[11px] font-semibold text-white/50">Containers</p>
      {list.map(c => (
        <div key={c.id} className="flex items-center gap-2 py-0.5 text-[12px]">
          <span className={`size-1.5 shrink-0 rounded-full ${c.state === 'running' ? 'bg-up' : 'bg-down'}`} />
          <span className="min-w-0 flex-1 truncate">{c.service || c.name.slice(0, 24)}</span>
          {c.state === 'running' ? (
            <span className="shrink-0 tabular-nums text-white/75">
              {c.cpu == null ? '…' : `${c.cpu}%`} · {bytes(c.mem)}
            </span>
          ) : (
            <span className="text-white/50">stopped</span>
          )}
        </div>
      ))}
    </div>
  );
}

// Add or edit a custom link tile.
export function LinkEditor({ link, onSave, onDelete, onClose, notify }) {
  const [name, setName] = useState(link?.name || '');
  const [url, setUrl] = useState(link?.url || 'https://');
  const [icon, setIcon] = useState(link?.icon || '');
  const fileRef = useRef(null);
  const valid = (() => {
    try {
      return ['http:', 'https:'].includes(new URL(url).protocol);
    } catch {
      return false;
    }
  })();
  const preview = { id: 'preview', kind: 'link', name: name || 'New link', urls: valid ? [url] : [], logo: icon || null, icons: linkIcons(url) };
  const field =
    'mt-1.5 w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-[14px] outline-none placeholder:text-white/40 focus:border-white/50';
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 px-4" onPointerDown={e => e.target === e.currentTarget && onClose()}>
      <motion.form
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
        onSubmit={e => {
          e.preventDefault();
          if (!valid) return notify('Enter a full http(s) address');
          onSave({ id: link?.id || `link:${Date.now().toString(36)}`, name: name.trim() || new URL(url).hostname, url: url.trim(), icon: icon.trim() });
        }}
        className="glass glass-dark w-full max-w-sm rounded-[28px] p-5"
      >
        <div className="flex items-center gap-4">
          <AppIcon item={preview} size={64} />
          <div className="min-w-0">
            <h2 className="truncate text-[17px] font-semibold">{link ? 'Edit link' : 'Add a link'}</h2>
            <p className="truncate text-[13px] text-white/60">Any website, tool or dashboard you use.</p>
          </div>
        </div>
        <label className="mt-5 block text-[13px] text-white/70">
          Address
          <input autoFocus value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" inputMode="url" className={field} />
        </label>
        <label className="mt-3 block text-[13px] text-white/70">
          Name
          <input value={name} onChange={e => setName(e.target.value)} placeholder={valid ? new URL(url).hostname : 'My link'} className={field} />
        </label>
        <label className="mt-3 block text-[13px] text-white/70">
          Icon image URL <span className="text-white/45">(optional, the site's icon is used otherwise)</span>
          <input value={icon.startsWith('data:') ? '' : icon} onChange={e => setIcon(e.target.value)} placeholder="https://…/logo.png" className={field} />
        </label>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => fileRef.current.click()}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[13px] hover:bg-white/20"
          >
            <Upload className="size-3.5" /> Upload icon
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={async e => {
              try {
                setIcon(await shrinkImage(e.target.files[0], 256, 'image/png'));
              } catch {
                notify('That image could not be read');
              }
            }}
          />
        </div>
        <div className="mt-6 flex items-center gap-2">
          {link && (
            <button type="button" onClick={() => onDelete(link)} className="mr-auto rounded-full px-3 py-2 text-[14px] text-down hover:bg-down/15">
              Remove
            </button>
          )}
          <button type="button" onClick={onClose} className="ml-auto rounded-full px-4 py-2 text-[14px] hover:bg-white/10">
            Cancel
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[14px] font-semibold text-black hover:bg-white/90">
            <Link2 className="size-4" /> Save
          </button>
        </div>
      </motion.form>
    </div>
  );
}

// Icons tried for a link, straight from the site (no server proxy, so any address works).
export const linkIcons = url => {
  try {
    const o = new URL(url).origin;
    return [`${o}/apple-touch-icon.png`, `${o}/favicon.svg`, `${o}/favicon.ico`];
  } catch {
    return [];
  }
};
