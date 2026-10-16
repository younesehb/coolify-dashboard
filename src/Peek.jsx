import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  Copy,
  EyeOff,
  FolderMinus,
  GitBranch,
  Globe,
  KeyRound,
  LoaderCircle,
  Pencil,
  Play,
  RefreshCcw,
  RotateCw,
  SlidersHorizontal,
  Square
} from 'lucide-react';
import { AppIcon, host, nameOf, status } from './ui';

const ago = iso => {
  const s = (Date.parse(iso) - Date.now()) / 1000;
  if (!Number.isFinite(s)) return null;
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  for (const [unit, n] of [
    ['year', 31536000],
    ['month', 2592000],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60]
  ])
    if (Math.abs(s) >= n) return rtf.format(Math.round(s / n), unit);
  return 'just now';
};

const ACTIONS = {
  redeploy: { label: 'Redeploy', confirm: 'Tap again to redeploy', icon: RotateCw },
  restart: { label: 'Restart', confirm: 'Tap again to restart', icon: RefreshCcw },
  stop: { label: 'Stop', confirm: 'Tap again to stop it', icon: Square, danger: true },
  start: { label: 'Start', confirm: 'Tap again to start', icon: Play }
};

function Quick({ icon: Icon, label, href, onClick }) {
  const Tag = href ? 'a' : 'button';
  return (
    <Tag
      {...(href ? { href, target: '_blank', rel: 'noreferrer' } : { type: 'button', onClick })}
      className="flex flex-1 flex-col items-center gap-1.5 rounded-2xl bg-white/10 py-2.5 text-[11px] font-medium text-white/85 outline-none transition-colors hover:bg-white/20 focus-visible:bg-white/20"
    >
      <Icon className="size-[18px]" strokeWidth={2} />
      {label}
    </Tag>
  );
}

// Long-press / right-click card: the iOS context preview, plus Coolify actions.
export default function Peek({
  peek,
  overrides,
  inFolder,
  actionsEnabled,
  hasKey,
  job,
  onClose,
  onCopy,
  onCustomise,
  onHide,
  onRemoveFromFolder,
  onAction,
  onKey,
  onEditLink,
  extra
}) {
  const { item, rect } = peek;
  const s = status(item);
  const [confirming, setConfirming] = useState(null);
  const [running, setRunning] = useState(null);
  const [askKey, setAskKey] = useState(null);
  const [error, setError] = useState('');
  const busy = job && !['finished', 'failed'].includes(job.status);

  useEffect(() => {
    const onKeyDown = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const size = Math.round(rect.width);
  const iconBox = { left: rect.left, top: rect.top };
  const width = Math.min(320, window.innerWidth - 24);
  const left = Math.max(12, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 12));
  // Measure the card, then sit it below the icon, above it, or (if it fits neither) centred with the icon hidden.
  const cardRef = useRef(null);
  const [place, setPlace] = useState({ top: iconBox.top + size + 14, below: true, icon: true, ready: false });
  useLayoutEffect(() => {
    const h = cardRef.current?.offsetHeight || 0;
    const vh = window.innerHeight;
    const belowTop = iconBox.top + size * 1.08 + 14;
    const aboveTop = iconBox.top - 14 - h;
    if (belowTop + h <= vh - 12) setPlace({ top: belowTop, below: true, icon: true, ready: true });
    else if (aboveTop >= 12) setPlace({ top: aboveTop, below: false, icon: true, ready: true });
    else setPlace({ top: Math.max(12, (vh - h) / 2), below: true, icon: false, ready: true });
  }, [item.id, extra ? 1 : 0, askKey]);
  const { top, below } = place;

  const isLink = item.kind === 'link';
  // Databases have no build step, so no Redeploy.
  const available =
    item.kind === 'database'
      ? s.key === 'down'
        ? ['start']
        : ['restart', 'stop']
      : s.key === 'down'
        ? ['start', 'redeploy']
        : ['redeploy', 'restart', 'stop'];
  const run = async action => {
    if (!hasKey) return setAskKey(action);
    if (confirming !== action) return setConfirming(action);
    setRunning(action);
    setError('');
    try {
      await onAction(item, action);
      onClose();
    } catch (e) {
      setRunning(null);
      setConfirming(null);
      if (e.status === 401) {
        setAskKey(action);
        setError('That password was not accepted.');
      } else setError(e.message);
    }
  };

  const row =
    'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[14px] outline-none transition-colors hover:bg-white/12 focus-visible:bg-white/12';
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-black/25 backdrop-blur-[6px]"
      onPointerDown={e => e.target === e.currentTarget && onClose()}
    >
      {place.icon && (
        <motion.div
          initial={{ scale: 1 }}
          animate={{ scale: 1.08 }}
          transition={{ type: 'spring', stiffness: 420, damping: 26 }}
          className="pointer-events-none absolute"
          style={iconBox}
        >
          <AppIcon item={item} overrides={overrides} size={size} />
        </motion.div>
      )}
      <motion.div
        ref={cardRef}
        role="menu"
        initial={{ opacity: 0, scale: 0.85, y: below ? -12 : 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 460, damping: 32 }}
        className="glass glass-dark absolute max-h-[calc(100vh-24px)] overflow-y-auto overscroll-contain rounded-[26px] p-2"
        style={{
          left,
          top,
          width,
          visibility: place.ready ? 'visible' : 'hidden',
          transformOrigin: `${rect.left + rect.width / 2 - left}px ${below ? 0 : '100%'}`
        }}
      >
        <div className="px-3 pb-3 pt-2">
          <p className="truncate text-[17px] font-semibold">{nameOf(item, overrides)}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[12px] text-white/65">
            <span className={`size-1.5 rounded-full ${s.dot}`} />
            {busy ? 'Working…' : s.label}
            {item.project && (
              <span>
                · {item.project}
                {item.environment && item.environment !== 'production' ? ` / ${item.environment}` : ''}
              </span>
            )}
            {ago(item.updatedAt) && <span>· updated {ago(item.updatedAt)}</span>}
          </p>
          {item.description && <p className="mt-2 line-clamp-2 text-[13px] text-white/75">{item.description}</p>}
        </div>

        <div className="flex gap-1.5 px-1 pb-2">
          {item.urls[0] && <Quick icon={Globe} label="Open" href={item.urls[0]} />}
          {item.manage && <Quick icon={SlidersHorizontal} label="Coolify" href={item.manage} />}
          {item.repo && <Quick icon={GitBranch} label="Repo" href={item.repo} />}
          {item.urls[0] && <Quick icon={Copy} label="Copy" onClick={() => onCopy(item.urls[0])} />}
        </div>

        {item.urls.length > 1 && (
          <div className="border-t border-white/10 py-1">
            {item.urls.slice(1).map(u => (
              <a key={u} href={u} target="_blank" rel="noreferrer" className={`${row} text-[13px] text-white/80`}>
                <Globe className="size-4 shrink-0 text-white/50" />
                <span className="truncate">{host(u)}</span>
              </a>
            ))}
          </div>
        )}

        {extra}

        {actionsEnabled && !isLink && (
          <div className="border-t border-white/10 py-1">
            {askKey ? (
              <form
                className="px-3 py-2"
                onSubmit={e => {
                  e.preventDefault();
                  const k = new FormData(e.currentTarget).get('key');
                  if (!k) return;
                  onKey(k);
                  setAskKey(null);
                  setConfirming(askKey);
                }}
              >
                <label className="flex items-center gap-2 text-[13px] text-white/75">
                  <KeyRound className="size-4" /> Actions password
                </label>
                <div className="mt-2 flex gap-2">
                  <input
                    name="key"
                    type="password"
                    autoFocus
                    autoComplete="current-password"
                    className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-[14px] outline-none focus:border-white/50"
                  />
                  <button className="rounded-xl bg-white px-3 text-[13px] font-semibold text-black">Unlock</button>
                </div>
                {error && <p className="mt-2 text-[12px] text-down">{error}</p>}
              </form>
            ) : (
              available.map(a => {
                const A = ACTIONS[a];
                const armed = confirming === a;
                return (
                  <button
                    key={a}
                    role="menuitem"
                    disabled={busy || !!running}
                    onClick={() => run(a)}
                    className={`${row} disabled:opacity-50 ${armed ? (A.danger ? 'bg-down/30 hover:bg-down/40' : 'bg-white/15') : ''} ${A.danger ? 'text-down' : ''}`}
                  >
                    {running === a ? <LoaderCircle className="size-4 animate-spin" /> : <A.icon className="size-4" />}
                    <span className={armed ? 'font-semibold' : ''}>{armed ? A.confirm : A.label}</span>
                  </button>
                );
              })
            )}
            {error && !askKey && <p className="px-3 pb-2 text-[12px] text-down">{error}</p>}
          </div>
        )}

        <div className="border-t border-white/10 pt-1">
          <button role="menuitem" className={row} onClick={() => (onClose(), isLink ? onEditLink(item) : onCustomise(item))}>
            <Pencil className="size-4 text-white/70" /> {isLink ? 'Edit or remove link' : 'Rename or change icon'}
          </button>
          {inFolder && (
            <button role="menuitem" className={row} onClick={() => (onClose(), onRemoveFromFolder(item))}>
              <FolderMinus className="size-4 text-white/70" /> Remove from folder
            </button>
          )}
          {!isLink && (
            <button role="menuitem" className={row} onClick={() => (onClose(), onHide(item))}>
              <EyeOff className="size-4 text-white/70" /> Hide from home screen
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
