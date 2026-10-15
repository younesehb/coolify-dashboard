import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AppWindow, Boxes, Globe, RotateCw, Search, Server, Settings2, Upload, X } from 'lucide-react';
import GlassSurface from './bits/GlassSurface';
import Dock from './bits/Dock';
import Grid from './Grid';
import Settings from './Settings';
import Peek from './Peek';
import Folder from './Folder';
import { AboutServer, NetworkCard, ServerCard, SystemGauges, UsageCard, bytes, systemCaption, useMetrics } from './SystemWidgets';
import { isFolder } from './Grid';
import { AppIcon, GithubMark, Num, host, isUp, matches, nameOf, status } from './ui';
import { SORTS, WALLPAPERS, shrinkImage, useSettings } from './prefs';

const greeting = () => {
  const h = new Date().getHours();
  return h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

function Customise({ item, overrides, onSave, onClose, notify }) {
  const current = overrides[item.id] || {};
  const [name, setName] = useState(current.name || '');
  const [icon, setIcon] = useState(current.icon || '');
  const fileRef = useRef(null);
  const preview = { ...overrides, [item.id]: { name, icon } };
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
          onSave(item, { name: name.trim(), icon: icon.trim() });
        }}
        className="glass glass-dark w-full max-w-sm rounded-[28px] p-5"
      >
        <div className="flex items-center gap-4">
          <AppIcon item={item} overrides={preview} size={64} />
          <div className="min-w-0">
            <h2 className="truncate text-[17px] font-semibold">{nameOf(item, preview)}</h2>
            <p className="truncate text-[13px] text-white/60">{item.urls[0] ? host(item.urls[0]) : item.name}</p>
          </div>
        </div>
        <label className="mt-5 block text-[13px] text-white/70">
          Name
          <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder={nameOf(item)} className={field} />
        </label>
        <label className="mt-3 block text-[13px] text-white/70">
          Icon image URL
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
          {icon && (
            <button type="button" onClick={() => setIcon('')} className="rounded-full bg-white/10 px-3 py-1.5 text-[13px] hover:bg-white/20">
              Use original
            </button>
          )}
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
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-[14px] hover:bg-white/10">
            Cancel
          </button>
          <button className="rounded-full bg-white px-4 py-2 text-[14px] font-semibold text-black hover:bg-white/90">Save</button>
        </div>
      </motion.form>
    </div>
  );
}

function Spotlight({ items, overrides, onClose }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const results = useMemo(() => items.filter(i => matches(i, q, overrides)).slice(0, 8), [items, q, overrides]);
  const open = (i, manage) => {
    const url = manage ? i.manage : i.urls[0] || i.manage;
    if (url) window.open(url, '_blank', 'noopener');
    onClose();
  };
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex justify-center bg-black/25 px-4 pt-[14vh]"
      onPointerDown={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        role="dialog"
        aria-label="Search"
        initial={{ opacity: 0, scale: 0.96, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 460, damping: 36 }}
        className="glass glass-dark h-fit w-full max-w-xl overflow-hidden rounded-3xl"
      >
        <label className="flex items-center gap-3 px-5 py-4">
          <Search className="size-5 text-white/70" />
          <input
            autoFocus
            value={q}
            onChange={e => {
              setQ(e.target.value);
              setSel(0);
            }}
            onKeyDown={e => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSel(s => Math.min(s + 1, results.length - 1));
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSel(s => Math.max(s - 1, 0));
              }
              if (e.key === 'Enter' && results[sel]) open(results[sel], e.metaKey || e.ctrlKey);
            }}
            placeholder="Search apps, domains, projects"
            className="w-full bg-transparent text-lg text-white outline-none placeholder:text-white/45"
          />
        </label>
        {results.length > 0 ? (
          <ul className="relative border-t border-white/10 p-2">
            {results.map((i, n) => {
              const s = status(i);
              return (
                <li key={i.id}>
                  <button
                    onMouseEnter={() => setSel(n)}
                    onClick={() => open(i)}
                    className="relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left"
                  >
                    {n === sel && (
                      <motion.span
                        layoutId="spot-sel"
                        className="absolute inset-0 rounded-xl bg-white/15"
                        transition={{ type: 'spring', stiffness: 600, damping: 40 }}
                      />
                    )}
                    <AppIcon item={i} overrides={overrides} size={36} className="relative" />
                    <span className="relative min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium">{nameOf(i, overrides)}</span>
                      <span className="block truncate text-[12px] text-white/60">{i.urls[0] ? host(i.urls[0]) : 'No public domain'}</span>
                    </span>
                    <span className="relative flex items-center gap-1.5 text-[12px] text-white/70">
                      <span className={`size-1.5 rounded-full ${s.dot}`} />
                      {s.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="border-t border-white/10 px-5 py-6 text-sm text-white/60">No app matches “{q}”.</p>
        )}
        <p className="border-t border-white/10 px-5 py-2.5 text-[11px] text-white/50">↵ open · ⌘↵ manage in Coolify · esc close</p>
      </motion.div>
    </motion.div>
  );
}

function Widget({ label, children, glass, delay, wide }) {
  return (
    <motion.figure
      layout
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30, delay }}
      className={`flex w-[86%] shrink-0 snap-center flex-col items-center gap-2.5 sm:w-auto ${wide ? 'sm:col-span-2' : ''}`}
    >
      <GlassSurface width="100%" height={148} borderRadius={28} {...glass}>
        <div className="h-full w-full p-3 text-left">{children}</div>
      </GlassSurface>
      <figcaption className="label text-[13px] font-medium">{label}</figcaption>
    </motion.figure>
  );
}

function Pill({ icon: Icon, label, value }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-full bg-white/10 py-3 shadow-[inset_0_1px_0_rgb(255_255_255/0.25)]">
      <Icon className="mb-1 size-[18px]" strokeWidth={2} />
      <span className="text-[12px] text-white/70">{label}</span>
      <span className="text-[15px] font-semibold tabular-nums">{value}</span>
    </div>
  );
}

const DockTile = ({ bg, children }) => (
  <span className="grid size-full place-items-center rounded-[23%] shadow-[inset_0_1px_0_rgb(255_255_255/0.35)]" style={{ background: bg }}>
    {children}
  </span>
);

export default function App() {
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const notify = text => {
    setToast({ text, id: Date.now() });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  };
  const [settings, update, reset, replace] = useSettings(() => notify('Could not save: that image is too large for this browser'));
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [peek, setPeek] = useState(null);
  const [about, setAbout] = useState(false);
  const [openFolder, setOpenFolder] = useState(null);
  const [jobs, setJobs] = useState({});
  const [actionsKey, setActionsKey] = useState(() => {
    try {
      return localStorage.getItem('launchpad.actionsKey') || '';
    } catch {
      return '';
    }
  });
  const [spotlight, setSpotlight] = useState(false);
  const [panel, setPanel] = useState(false);
  const [customising, setCustomising] = useState(null);
  const [query, setQuery] = useState('');
  const [pulse, setPulse] = useState(new Set());
  const [first, setFirst] = useState(true);
  const [wallEl, setWallEl] = useState(null);
  const searchRef = useRef(null);
  const prevStatus = useRef(null);
  const overrides = settings.overrides;

  const load = async fresh => {
    setLoading(true);
    try {
      const r = await fetch(`/api/apps${fresh ? '?fresh=1' : ''}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
      const now = Object.fromEntries(d.items.map(i => [i.id, status(i).key]));
      if (prevStatus.current) {
        const changed = d.items.filter(i => prevStatus.current[i.id] && prevStatus.current[i.id] !== now[i.id]);
        if (changed.length) {
          const c = changed[0];
          notify(
            changed.length > 1
              ? `${changed.length} apps changed status`
              : `${nameOf(c, overrides)} is ${now[c.id] === 'up' ? 'running again' : status(c).label.toLowerCase()}`
          );
          setPulse(new Set(changed.map(i => i.id)));
          setTimeout(() => setPulse(new Set()), 2600);
        }
      }
      prevStatus.current = now;
      setData(d);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    const t = setInterval(() => load(), settings.refreshSeconds * 1000);
    return () => clearInterval(t);
  }, [settings.refreshSeconds]);
  useEffect(() => {
    if (!data) return;
    const t = setTimeout(() => setFirst(false), 1400);
    return () => clearTimeout(t);
  }, [!data]);

  useEffect(() => {
    const onKey = e => {
      const typing = /input|textarea|select/i.test(document.activeElement?.tagName);
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSpotlight(true);
      } else if (e.key === ',' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPanel(true);
      } else if (e.key === 'Escape') {
        setOpenFolder(null);
      } else if (e.key === '/' && !typing) {
        e.preventDefault();
        settings.showSearch ? searchRef.current?.focus() : setSpotlight(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [settings.showSearch]);

  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty('--glass-blur', `${settings.glassBlur}px`);
    root.setProperty('--glass-top', `rgb(255 255 255 / ${settings.glassTint})`);
    root.setProperty('--glass-bottom', `rgb(255 255 255 / ${settings.glassTint * 0.4})`);
  }, [settings.glassBlur, settings.glassTint]);

  const items = data?.items || [];

  // Follow running actions until Coolify reports them done, then refresh.
  useEffect(() => {
    const pending = Object.entries(jobs).filter(([, j]) => j.status === 'running');
    if (!pending.length) return;
    const t = setInterval(async () => {
      for (const [id, j] of pending) {
        let st = 'running';
        if (j.deploymentId) {
          try {
            st = (await (await fetch(`/api/deployment/${j.deploymentId}`)).json()).status || 'running';
          } catch {}
          if (st.startsWith('cancel')) st = 'failed';
        } else if (Date.now() - j.started > 8000) st = 'finished';
        if (st !== 'finished' && st !== 'failed') continue;
        const name = nameOf(items.find(i => i.id === id) || { id, name: 'App', urls: [] }, overrides);
        setJobs(js => ({ ...js, [id]: { ...js[id], status: st } }));
        notify(st === 'finished' ? `${name}: ${j.action} finished` : `${name}: ${j.action} failed. Open it in Coolify for the logs.`);
        setPulse(new Set([id]));
        setTimeout(() => setPulse(new Set()), 2600);
        load(true);
        setTimeout(
          () =>
            setJobs(js => {
              const { [id]: _, ...rest } = js;
              return rest;
            }),
          1500
        );
      }
    }, 3000);
    return () => clearInterval(t);
  }, [jobs]);
  const folderOf = useMemo(() => {
    const m = {};
    for (const [fid, f] of Object.entries(settings.folders)) for (const id of f.ids) m[id] = fid;
    return m;
  }, [settings.folders]);

  // The grid shows loose apps plus folders. Searching flattens folders so every match is visible.
  const entries = useMemo(() => {
    const apps = items
      .filter(i => !settings.hidden.includes(i.id))
      .filter(i => settings.showStopped || status(i).key !== 'down')
      .filter(i => settings.showServices || i.kind === 'app')
      .filter(i => matches(i, query, overrides));
    const byId = new Map(apps.map(a => [a.id, a]));
    const list = query
      ? apps
      : [
          ...apps.filter(a => !folderOf[a.id]),
          ...Object.entries(settings.folders)
            .map(([id, f]) => ({ type: 'folder', id, name: f.name, apps: f.ids.map(x => byId.get(x)).filter(Boolean) }))
            .filter(f => f.apps.length)
        ];
    const rank = new Map(settings.order.map((id, n) => [id, n]));
    const label = e => (isFolder(e) ? e.name : nameOf(e, overrides));
    const sev = e => (isFolder(e) ? Math.max(...e.apps.map(a => status(a).rank)) : status(e).rank);
    const time = e => (isFolder(e) ? Math.max(...e.apps.map(a => Date.parse(a.updatedAt) || 0)) : Date.parse(e.updatedAt) || 0);
    const byName = (a, b) => label(a).localeCompare(label(b));
    const sorters = {
      custom: (a, b) => (rank.get(a.id) ?? 1e6) - (rank.get(b.id) ?? 1e6) || byName(a, b),
      name: byName,
      status: (a, b) => sev(b) - sev(a) || byName(a, b),
      recent: (a, b) => time(b) - time(a),
      project: (a, b) => (isFolder(a) ? a.name : a.project || '').localeCompare(isFolder(b) ? b.name : b.project || '') || byName(a, b)
    };
    return list.sort(sorters[settings.sort] || sorters.name);
  }, [items, settings, query, overrides, folderOf]);

  const up = items.filter(isUp).length;
  const attention = items.filter(i => !isUp(i));
  const domains = new Set(items.flatMap(i => i.urls.map(host))).size;
  const ghOwner = useMemo(() => {
    const c = {};
    for (const i of items) {
      const m = i.repo?.match(/github\.com\/([^/]+)/);
      if (m) c[m[1]] = (c[m[1]] || 0) + 1;
    }
    return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0];
  }, [items]);

  const owner = settings.name || data?.owner;
  const wallSrc =
    settings.wallpaper === 'custom' && settings.customWallpaper
      ? settings.customWallpaper
      : `/wallpapers/${settings.wallpaper === 'custom' ? 'beach' : settings.wallpaper}.webp`;
  const glass = {
    blur: Math.round(settings.glassBlur / 2.4),
    backgroundOpacity: settings.glassTint * 0.6,
    saturation: 1.5,
    distortionScale: -70,
    redOffset: 0,
    greenOffset: 3,
    blueOffset: 6,
    brightness: 55,
    backdrop: wallEl,
    style: { colorScheme: 'light' }
  };
  const layoutKey = [
    settings.sort,
    Object.keys(settings.folders).length,
    settings.showStopped,
    settings.showServices,
    settings.hidden.length,
    settings.iconSize,
    settings.showLabels,
    query
  ].join('|');
  const W = settings.widgets;
  const metricsOn = W.server || W.system || W.memory || W.storage || W.network;
  const m = useMetrics(metricsOn);
  const mOk = !!m?.available;
  const shown = {
    server: W.server && mOk,
    system: W.system && mOk,
    memory: W.memory && mOk,
    storage: W.storage && mOk && m.diskTotal != null,
    network: W.network && mOk,
    health: W.health,
    attention: W.attention,
    instance: W.instance
  };
  const widgetCount = Object.values(shown).filter(Boolean).length + (shown.network ? 1 : 0);

  const openPeek = (item, el) => setPeek({ item, rect: (el.querySelector('div') || el).getBoundingClientRect() });
  const openFolderAt = (folder, el) => {
    const r = (el.querySelector('div') || el).getBoundingClientRect();
    setOpenFolder({ id: folder.id, origin: { x: r.left + r.width / 2, y: r.top + r.height / 2 } });
  };

  // Drop an app onto another app to make a folder, or onto a folder to add it.
  const merge = (activeId, targetId, ids) => {
    const target = entries.find(e => e.id === targetId);
    const dragged = items.find(i => i.id === activeId);
    if (!dragged || !target) return;
    navigator.vibrate?.(12);
    update(s => {
      const folders = { ...s.folders };
      let fid = targetId;
      if (isFolder(target)) folders[fid] = { ...folders[fid], ids: [...folders[fid].ids, activeId] };
      else {
        fid = `folder:${Date.now().toString(36)}`;
        folders[fid] = { name: target.project && target.project === dragged.project ? target.project : 'Folder', ids: [targetId, activeId] };
      }
      const order = ids.filter(id => id !== activeId).map(id => (id === targetId ? fid : id));
      return { folders, sort: 'custom', dragTip: false, order: [...order, ...s.order.filter(id => !order.includes(id) && id !== activeId && id !== targetId)] };
    });
  };
  const removeFromFolder = (fid, appId) =>
    update(s => {
      const f = s.folders[fid];
      if (!f) return {};
      const left = f.ids.filter(x => x !== appId);
      const folders = { ...s.folders };
      let order = s.order.includes(fid) ? [...s.order] : [...s.order, fid];
      const at = order.indexOf(fid);
      // A folder with one app left dissolves back into a plain icon, like iOS.
      if (left.length <= 1) {
        delete folders[fid];
        order.splice(at, 1, ...left, appId);
      } else {
        folders[fid] = { ...f, ids: left };
        order.splice(at + 1, 0, appId);
      }
      order = order.filter((id, n) => order.indexOf(id) === n);
      return { folders, order, sort: 'custom' };
    });
  const groupByProject = () =>
    update(s => {
      const groups = {};
      for (const i of items) if (!s.hidden.includes(i.id) && i.project) (groups[i.project] ||= []).push(i.id);
      const folders = {};
      const grouped = new Set();
      for (const [p, ids] of Object.entries(groups))
        if (ids.length > 1) {
          folders[`folder:${p.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`] = { name: p, ids };
          ids.forEach(x => grouped.add(x));
        }
      return { folders, sort: 'custom', order: [...Object.keys(folders), ...items.map(i => i.id).filter(id => !grouped.has(id))] };
    });

  const VERB = { redeploy: 'Redeploying', restart: 'Restarting', stop: 'Stopping', start: 'Starting' };
  const runAction = async (item, action) => {
    const r = await fetch('/api/action', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-launchpad-key': actionsKey },
      body: JSON.stringify({ id: item.id, action })
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      if (r.status === 401) saveKey('');
      throw Object.assign(new Error(d.error || `HTTP ${r.status}`), { status: r.status });
    }
    setJobs(j => ({ ...j, [item.id]: { action, deploymentId: d.deploymentId, status: 'running', started: Date.now() } }));
    notify(`${VERB[action]} ${nameOf(item, overrides)}…`);
  };
  const saveKey = k => {
    setActionsKey(k);
    try {
      localStorage.setItem('launchpad.actionsKey', k);
    } catch {}
  };
  // Dropping an icon always lands in "My order": the arrangement on screen becomes the saved order.
  const reorder = ids => {
    if (settings.sort !== 'custom') notify('Saved as My order');
    update(s => ({ sort: 'custom', dragTip: false, order: [...ids, ...s.order.filter(id => !ids.includes(id))] }));
  };
  const copy = async url => {
    setPeek(null);
    try {
      await navigator.clipboard.writeText(url);
      notify('Link copied');
    } catch {
      notify('Copy failed');
    }
  };
  const hide = item => {
    update(s => ({ hidden: [...s.hidden, item.id] }));
    notify(`${nameOf(item, overrides)} hidden. Bring it back in Customise.`);
  };
  const nextWall = () => {
    const ids = WALLPAPERS.map(w => w.id).concat(settings.customWallpaper ? ['custom'] : []);
    update({ wallpaper: ids[(ids.indexOf(settings.wallpaper) + 1) % ids.length] });
  };

  const dockItems = [
    data?.coolifyUrl && {
      label: 'Coolify',
      badge: attention.length || undefined,
      icon: (
        <DockTile bg="linear-gradient(180deg,#3a3a42,#16161a)">
          <Server className="size-[46%] text-white" strokeWidth={1.75} />
        </DockTile>
      ),
      onClick: () => window.open(data.coolifyUrl, '_blank', 'noopener')
    },
    ghOwner && {
      label: 'GitHub',
      icon: (
        <DockTile bg="linear-gradient(180deg,#ffffff,#e4e4ea)">
          <GithubMark className="size-[46%] text-black" />
        </DockTile>
      ),
      onClick: () => window.open(`https://github.com/${ghOwner}`, '_blank', 'noopener')
    },
    { separator: true },
    {
      label: 'Search',
      icon: (
        <DockTile bg="linear-gradient(160deg,#8e8e93,#48484a)">
          <Search className="size-[46%] text-white" strokeWidth={2} />
        </DockTile>
      ),
      onClick: () => setSpotlight(true)
    },
    {
      label: 'Wallpaper',
      icon: (
        <DockTile bg="linear-gradient(160deg,#ffb36b,#ff5f6d)">
          <span className="size-[52%] rounded-[30%] bg-cover bg-center ring-2 ring-white/80" style={{ backgroundImage: `url(${wallSrc})` }} />
        </DockTile>
      ),
      onClick: nextWall,
      menu: [
        ...WALLPAPERS.map(w => ({ label: w.label, checked: settings.wallpaper === w.id, onClick: () => update({ wallpaper: w.id }) })),
        ...(settings.customWallpaper
          ? [{ label: 'My wallpaper', checked: settings.wallpaper === 'custom', onClick: () => update({ wallpaper: 'custom' }) }]
          : []),
        { separator: true },
        { label: 'Upload or tune…', onClick: () => setPanel(true) }
      ]
    },
    {
      label: 'Refresh',
      icon: (
        <DockTile bg="linear-gradient(160deg,#6be585,#2eb85c)">
          <RotateCw className={`size-[46%] text-white ${loading ? 'animate-spin' : ''}`} strokeWidth={1.75} />
        </DockTile>
      ),
      onClick: () => load(true)
    },
    {
      label: 'Customise',
      active: panel,
      icon: (
        <DockTile bg="linear-gradient(160deg,#c7c7cc,#8e8e93)">
          <Settings2 className="size-[46%] text-white" strokeWidth={1.75} />
        </DockTile>
      ),
      onClick: () => setPanel(true)
    }
  ].filter(Boolean);

  return (
    <>
      <AnimatePresence initial={false}>
        <motion.img
          key={wallSrc}
          ref={el => el && setWallEl(el)}
          src={wallSrc}
          alt=""
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 -z-20 size-full object-cover"
        />
      </AnimatePresence>
      <div
        className="fixed inset-0 -z-10"
        style={{
          background: `linear-gradient(180deg, rgb(0 0 0 / ${settings.dim + 0.05}), rgb(0 0 0 / ${settings.dim * 0.4}) 40%, rgb(0 0 0 / ${settings.dim + 0.25}))`
        }}
      />

      <main className="mx-auto max-w-[1080px] px-4 pb-52 pt-14 sm:px-8 sm:pt-20">
        <AnimatePresence initial={false}>
          {settings.showGreeting && (
            <motion.h1
              key="greeting"
              initial={{ opacity: 0, y: -10, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="label text-center text-[40px] font-bold leading-[1.05] tracking-[-0.02em] text-balance sm:text-[60px]"
            >
              {greeting()}
              {owner ? `, ${owner}` : ''}.
            </motion.h1>
          )}
        </AnimatePresence>

        {settings.showSearch && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="mx-auto mt-8 max-w-[560px]"
          >
            <GlassSurface width="100%" height={52} borderRadius={26} {...glass}>
              <label className="flex w-full items-center gap-3 px-3">
                <Search className="size-[18px] shrink-0 text-white/80" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => {
                    const hit = entries.find(x => !isFolder(x));
                    if (e.key === 'Enter' && hit) window.open(hit.urls[0] || hit.manage, '_blank', 'noopener');
                    if (e.key === 'Escape') {
                      setQuery('');
                      e.currentTarget.blur();
                    }
                  }}
                  placeholder="Search apps, domains, projects"
                  className="label w-full bg-transparent text-[16px] text-white outline-none placeholder:text-white/70"
                />
                {query ? (
                  <button
                    onClick={() => setQuery('')}
                    aria-label="Clear search"
                    className="grid size-6 shrink-0 place-items-center rounded-full bg-white/25 hover:bg-white/35"
                  >
                    <X className="size-3.5" />
                  </button>
                ) : (
                  <kbd className="shrink-0 rounded-md bg-white/15 px-1.5 py-0.5 font-sans text-[12px] text-white/80">/</kbd>
                )}
              </label>
            </GlassSurface>
          </motion.div>
        )}

        {error && (
          <div role="alert" className="glass glass-dark mx-auto mt-10 max-w-md rounded-3xl p-5 text-center">
            <p className="font-semibold">Coolify isn’t answering.</p>
            <p className="mt-1 text-sm text-white/70">Check COOLIFY_URL and COOLIFY_TOKEN on the server.</p>
            <p className="mt-2 font-mono text-xs text-white/50">{error}</p>
            <button onClick={() => load(true)} className="mt-4 rounded-full bg-white/15 px-4 py-1.5 text-sm hover:bg-white/25">
              Try again
            </button>
          </div>
        )}

        {widgetCount > 0 && !query && (
          <section className="mx-auto mt-10 grid max-w-[940px] grid-cols-1 gap-6 sm:mt-12">
            <div
              className={`-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:gap-6 sm:overflow-visible sm:px-0 ${widgetCount >= 3 ? 'sm:grid-cols-3' : widgetCount === 2 ? 'sm:grid-cols-2' : 'sm:mx-auto sm:w-[320px]'}`}
            >
              <AnimatePresence mode="popLayout">
                {shown.server && (
                  <Widget key="server" label="Server" glass={glass} delay={0.04}>
                    <ServerCard m={m} onOpen={() => setAbout(true)} />
                  </Widget>
                )}
                {shown.network && (
                  <Widget key="network" label="Network" glass={glass} delay={0.18} wide>
                    <NetworkCard m={m} />
                  </Widget>
                )}
                {shown.system && (
                  <Widget key="system" label={systemCaption(m)} glass={glass} delay={0.06}>
                    <SystemGauges m={m} />
                  </Widget>
                )}
                {shown.memory && (
                  <Widget key="memory" label="Memory" glass={glass} delay={0.1}>
                    <UsageCard
                      title="Memory"
                      used={m.memUsed}
                      total={m.memTotal}
                      footnote={m.swapTotal ? `${bytes(m.memTotal - m.memUsed)} left · swap ${Math.round((m.swapUsed / m.swapTotal) * 100)}%` : undefined}
                    />
                  </Widget>
                )}
                {shown.health && (
                  <Widget key="health" label="Health" glass={glass} delay={0.1}>
                    <div className="px-2 py-1">
                      <p className="text-[13px] text-white/75">Running</p>
                      <p className="mt-0.5 text-[30px] font-semibold leading-none tabular-nums">
                        {data ? <Num value={up} /> : '—'}
                        <span className="text-[15px] font-medium text-white/65"> / {data ? items.length : '—'}</span>
                      </p>
                      <p className="mt-4 text-[13px] text-white/75">
                        {data ? (attention.length ? `${attention.length} need attention` : 'Everything is up') : 'Loading'}
                      </p>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/25">
                        <motion.div
                          className="h-full rounded-full bg-white"
                          initial={{ width: 0 }}
                          animate={{ width: data && items.length ? `${(up / items.length) * 100}%` : 0 }}
                          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                        />
                      </div>
                    </div>
                  </Widget>
                )}
                {shown.instance && (
                  <Widget key="instance" label="Instance" glass={glass} delay={0.18}>
                    <div className="flex h-full gap-2">
                      <Pill icon={AppWindow} label="Apps" value={data ? <Num value={items.filter(i => i.kind === 'app').length} /> : '—'} />
                      <Pill icon={Boxes} label="Services" value={data ? <Num value={items.filter(i => i.kind === 'service').length} /> : '—'} />
                      <Pill icon={Globe} label="Domains" value={data ? <Num value={domains} /> : '—'} />
                    </div>
                  </Widget>
                )}
                {shown.storage && (
                  <Widget key="storage" label="Storage" glass={glass} delay={0.14}>
                    <UsageCard title="Storage" used={m.diskUsed} total={m.diskTotal} />
                  </Widget>
                )}
                {shown.attention && (
                  <Widget key="attention" label="Needs attention" glass={glass} delay={0.26}>
                    {data && attention.length === 0 && <p className="grid h-full place-items-center text-[15px] text-white/85">All systems running</p>}
                    <ul className="space-y-0.5">
                      {attention.slice(0, attention.length > 3 ? 2 : 3).map(i => {
                        const s = status(i);
                        return (
                          <li key={i.id}>
                            <a
                              href={i.manage || i.urls[0]}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 outline-none hover:bg-white/15 focus-visible:bg-white/15"
                            >
                              <AppIcon item={i} overrides={overrides} size={28} />
                              <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{nameOf(i, overrides)}</span>
                              <span className="flex items-center gap-1.5 text-[12px] text-white/80">
                                <span className={`size-1.5 rounded-full ${s.dot}`} />
                                {s.label}
                              </span>
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                    {attention.length > 3 && (
                      <button onClick={() => update({ sort: 'status' })} className="px-2 pt-1 text-[12px] text-white/75 underline-offset-2 hover:underline">
                        and {attention.length - 2} more
                      </button>
                    )}
                  </Widget>
                )}
              </AnimatePresence>
            </div>
          </section>
        )}

        <div className="sticky top-3 z-20 mx-auto mb-8 mt-12 flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-full p-1 glass">
          {SORTS.map(s => (
            <button
              key={s.id}
              onClick={() => update({ sort: s.id })}
              aria-pressed={settings.sort === s.id}
              className="relative shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium outline-none"
            >
              {settings.sort === s.id && (
                <motion.span
                  layoutId="sort-pill"
                  className="absolute inset-0 rounded-full bg-white/30 shadow-[inset_0_1px_0_rgb(255_255_255/0.4)]"
                  transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                />
              )}
              <span className="label relative">{s.label}</span>
            </button>
          ))}
        </div>

        <AnimatePresence>
          {settings.dragTip && data && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="label -mt-4 mb-6 text-center text-[13px] text-white/85"
            >
              Drag any icon to move it. Right-click for more.
            </motion.p>
          )}
        </AnimatePresence>

        {!data && !error && (
          <div className="mx-auto grid max-w-[980px] grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-y-7">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="glass size-[64px] animate-pulse rounded-[23%] sm:size-[76px]" />
                <div className="h-3 w-14 rounded bg-white/20" />
              </div>
            ))}
          </div>
        )}

        {data && (
          <Grid
            entries={entries}
            settings={settings}
            layoutKey={layoutKey}
            first={first}
            pulse={pulse}
            jobs={jobs}
            onPeek={openPeek}
            onOpenFolder={openFolderAt}
            onReorder={reorder}
            onMerge={merge}
          />
        )}
        {data && !entries.length && (
          <p className="label mt-4 text-center text-[15px]">
            {query ? `Nothing matches “${query}”.` : 'Every app is hidden by your filters.'}{' '}
            <button
              className="underline underline-offset-4"
              onClick={() => {
                setQuery('');
                update({ showStopped: true, showServices: true });
              }}
            >
              Show everything
            </button>
          </p>
        )}
      </main>

      {settings.showDock && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-[110px]">
          <Dock
            items={dockItems}
            baseItemSize={50}
            magnification={settings.magnify ? 74 : 50}
            panelHeight={66}
            className="pointer-events-auto"
            tiles={false}
            showLabels
            showBadges
            showIndicators
            style={{
              '--dock-panel': 'rgba(255,255,255,0.16)',
              '--dock-panel-edge': 'rgba(255,255,255,0.24)',
              '--dock-panel-highlight': 'rgba(255,255,255,0.4)'
            }}
          />
        </div>
      )}

      <AnimatePresence>
        {openFolder && entries.find(e => e.id === openFolder.id) && (
          <Folder
            key={`folder-${openFolder.id}`}
            folder={entries.find(e => e.id === openFolder.id)}
            origin={openFolder.origin}
            settings={settings}
            jobs={jobs}
            pulse={pulse}
            onClose={() => setOpenFolder(null)}
            onPeek={openPeek}
            onRename={name => update(s => ({ folders: { ...s.folders, [openFolder.id]: { ...s.folders[openFolder.id], name } } }))}
            onReorder={ids =>
              update(s => ({
                folders: {
                  ...s.folders,
                  [openFolder.id]: { ...s.folders[openFolder.id], ids: [...ids, ...s.folders[openFolder.id].ids.filter(x => !ids.includes(x))] }
                }
              }))
            }
            onRemove={appId => removeFromFolder(openFolder.id, appId)}
          />
        )}
        {about && mOk && <AboutServer key="about" m={m} coolifyUrl={data?.coolifyUrl} onClose={() => setAbout(false)} />}
        {peek && (
          <Peek
            key={`peek-${peek.item.id}`}
            peek={peek}
            overrides={overrides}
            inFolder={!!folderOf[peek.item.id]}
            actionsEnabled={!!data?.actions}
            hasKey={!!actionsKey}
            job={jobs[peek.item.id]}
            onClose={() => setPeek(null)}
            onCopy={copy}
            onCustomise={setCustomising}
            onHide={hide}
            onRemoveFromFolder={item => removeFromFolder(folderOf[item.id], item.id)}
            onAction={runAction}
            onKey={saveKey}
          />
        )}
        {spotlight && (
          <Spotlight key="spot" items={items.filter(i => !settings.hidden.includes(i.id))} overrides={overrides} onClose={() => setSpotlight(false)} />
        )}
        {panel && (
          <Settings
            key="panel"
            settings={settings}
            update={update}
            reset={reset}
            replace={replace}
            items={items}
            onClose={() => setPanel(false)}
            notify={notify}
            onGroup={groupByProject}
          />
        )}
        {customising && (
          <Customise
            key="custom"
            item={customising}
            overrides={overrides}
            notify={notify}
            onClose={() => setCustomising(null)}
            onSave={(item, o) => {
              update(s => {
                const { [item.id]: _, ...rest } = s.overrides;
                return { overrides: o.name || o.icon ? { ...rest, [item.id]: o } : rest };
              });
              setCustomising(null);
            }}
          />
        )}
        {toast && (
          <motion.div
            key={toast.id}
            role="status"
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="glass glass-dark fixed left-1/2 top-4 z-[60] -translate-x-1/2 rounded-full px-4 py-2 text-[13px]"
          >
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
