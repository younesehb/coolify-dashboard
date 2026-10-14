import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { DndContext, DragOverlay, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AppIcon, host, nameOf, status } from './ui';

const SPRING = { type: 'spring', stiffness: 420, damping: 34, mass: 0.8 };
export const isFolder = e => e.type === 'folder';
const pointOf = e => (e?.touches?.[0] ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e?.clientX ?? 0, y: e?.clientY ?? 0 });

// iOS download-style ring while an action runs. It creeps toward ~92% over two minutes, then snaps full when Coolify says done.
function Ring({ job, size }) {
  const r = size / 2 + 5;
  const c = 2 * Math.PI * r;
  const done = job.status === 'finished';
  const failed = job.status === 'failed';
  return (
    <svg className="pointer-events-none absolute -inset-[7px] z-10 -rotate-90" width={size + 14} height={size + 14} aria-hidden="true">
      <circle cx={size / 2 + 7} cy={size / 2 + 7} r={r} fill="none" stroke="rgb(255 255 255 / 0.25)" strokeWidth="3" />
      <circle
        cx={size / 2 + 7}
        cy={size / 2 + 7}
        r={r}
        fill="none"
        stroke={failed ? 'var(--down)' : 'white'}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={c}
        className={done || failed ? 'ring-done' : 'ring-run'}
        style={{ '--c': c, strokeDashoffset: done || failed ? 0 : undefined }}
      />
    </svg>
  );
}

export function Tile({ item, index = 0, settings, jiggle, pulse, job, mergeTarget, onPeek, onPressPeek }) {
  const s = status(item);
  const [primary] = item.urls;
  const Tag = primary ? 'a' : 'button';
  const timer = useRef(null);
  const from = useRef(null);
  const cancel = () => clearTimeout(timer.current);
  return (
    <Tag
      {...(primary ? { href: primary, target: '_blank', rel: 'noreferrer', draggable: false } : { type: 'button' })}
      onClick={e => !primary && onPeek(item, e.currentTarget)}
      onContextMenu={e => {
        e.preventDefault();
        onPeek(item, e.currentTarget);
      }}
      // Mouse long-press opens the peek card; any movement hands over to dragging instead.
      onPointerDown={e => {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        from.current = [e.clientX, e.clientY];
        const el = e.currentTarget;
        timer.current = setTimeout(() => onPressPeek(item, el), 520);
      }}
      onPointerMove={e => from.current && Math.hypot(e.clientX - from.current[0], e.clientY - from.current[1]) > 5 && cancel()}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      title={primary ? host(primary) : 'No public domain'}
      className="group flex w-full select-none flex-col items-center gap-2 rounded-2xl outline-none [-webkit-touch-callout:none]"
    >
      <div
        style={{ animationDelay: `-${(index % 7) * 61}ms` }}
        className={`relative transition-transform duration-300 ease-spring group-hover:-translate-y-1 group-hover:scale-[1.06] group-active:scale-95 ${jiggle ? 'wiggle' : ''} ${mergeTarget ? 'scale-[1.12]' : ''} ${s.key === 'down' && !job ? 'opacity-55 grayscale-[0.6]' : ''}`}
      >
        {mergeTarget && <span className="glass absolute -inset-3 -z-10 rounded-[26%]" aria-hidden="true" />}
        <AppIcon item={item} overrides={settings.overrides} size={settings.iconSize} className={job && job.status !== 'finished' ? 'brightness-75' : ''} />
        {job && <Ring job={job} size={settings.iconSize} />}
        {s.key !== 'up' && !job && (
          <span className={`absolute -right-1 -top-1 size-3.5 rounded-full ${s.dot} ring-2 ring-black/25 ${pulse ? 'ping-once' : ''}`} aria-label={s.label} />
        )}
        {pulse && s.key === 'up' && <span className="ping-ring absolute inset-0 rounded-[23%]" aria-hidden="true" />}
      </div>
      {settings.showLabels && (
        <span
          className="label max-w-full truncate px-1 text-[13px] font-medium text-white group-focus-visible:underline"
          style={{ maxWidth: settings.iconSize + 36 }}
        >
          {nameOf(item, settings.overrides)}
        </span>
      )}
    </Tag>
  );
}

function FolderTile({ folder, settings, jiggle, mergeTarget, onOpen }) {
  const size = settings.iconSize;
  const cell = (size - 14) / 3;
  const worst = folder.apps.reduce((w, a) => Math.max(w, status(a).rank), 0);
  return (
    <button
      type="button"
      onClick={e => onOpen(folder, e.currentTarget)}
      onContextMenu={e => (e.preventDefault(), onOpen(folder, e.currentTarget))}
      className="group flex w-full select-none flex-col items-center gap-2 rounded-2xl outline-none"
    >
      <div
        className={`relative transition-transform duration-300 ease-spring group-hover:-translate-y-1 group-hover:scale-[1.06] group-active:scale-95 ${jiggle ? 'wiggle' : ''} ${mergeTarget ? 'scale-[1.12]' : ''}`}
      >
        <div className="glass grid grid-cols-3 content-start gap-[3px] rounded-[23%] p-[5px]" style={{ width: size, height: size }}>
          {folder.apps.slice(0, 9).map(a => (
            <AppIcon key={a.id} item={a} overrides={settings.overrides} size={cell} className="!shadow-none" />
          ))}
        </div>
        {worst > 0 && <span className={`absolute -right-1 -top-1 size-3.5 rounded-full ${worst === 2 ? 'bg-down' : 'bg-warn'} ring-2 ring-black/25`} />}
      </div>
      {settings.showLabels && (
        <span className="label max-w-full truncate px-1 text-[13px] font-medium text-white" style={{ maxWidth: size + 36 }}>
          {folder.name}
        </span>
      )}
    </button>
  );
}

function SortableEntry({ entry, index, layoutKey, first, ...rest }) {
  const { listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.id });
  return (
    <motion.div
      data-entry={entry.id}
      layout="position"
      layoutDependency={layoutKey}
      initial={{ opacity: 0, scale: 0.6, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.18 } }}
      transition={{ ...SPRING, delay: first ? Math.min(index * 0.022, 0.6) : 0, layout: SPRING }}
    >
      {/* The empty slot stays as a faint ghost so you can see where the icon will land. */}
      <div
        ref={setNodeRef}
        style={{ transform: CSS.Translate.toString(transform), transition, opacity: isDragging ? 0.25 : 1, touchAction: 'manipulation' }}
        {...listeners}
      >
        {isFolder(entry) ? (
          <FolderTile folder={entry} {...rest} />
        ) : (
          <Tile item={entry} index={index} {...rest} job={rest.jobs[entry.id]} pulse={rest.pulse.has(entry.id)} />
        )}
      </div>
    </motion.div>
  );
}

export const useSmall = () => {
  const q = '(max-width: 639px)';
  const [small, setSmall] = useState(() => matchMedia(q).matches);
  useEffect(() => {
    const m = matchMedia(q);
    const on = () => setSmall(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return small;
};

export const sensorsConfig = [
  // Mouse: a 6px move starts a drag, so a plain click still opens the app.
  [MouseSensor, { activationConstraint: { distance: 6 } }],
  // Touch: hold ~0.2s to pick an icon up, so swiping still scrolls the page.
  [TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }]
];

export default function Grid({ entries, settings: base, layoutKey, first, pulse, jobs, onPeek, onOpenFolder, onReorder, onMerge }) {
  const small = useSmall();
  // Phones get ~80% icons so four fit per row, like iOS.
  const settings = small ? { ...base, iconSize: Math.round(base.iconSize * 0.8) } : base;
  const [active, setActive] = useState(null);
  const [merge, setMerge] = useState(null);
  const dwell = useRef({ id: null, t: 0 });
  const dragged = useRef(false);
  const sensors = useSensors(useSensor(...sensorsConfig[0]), useSensor(...sensorsConfig[1]));
  const ids = entries.map(e => e.id);
  const min = Math.max(72, settings.iconSize + 20);

  const clearMerge = () => {
    clearTimeout(dwell.current.t);
    dwell.current = { id: null, t: 0 };
    setMerge(null);
  };
  const suppressClick = () => {
    dragged.current = true;
    setTimeout(() => (dragged.current = false), 0);
  };
  const end = () => {
    setActive(null);
    clearMerge();
    suppressClick();
  };
  const elementOf = id => document.querySelector(`[data-entry="${CSS.escape(id)}"] a, [data-entry="${CSS.escape(id)}"] button`);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={e => {
        dragged.current = true;
        navigator.vibrate?.(8);
        setActive(entries.find(x => x.id === e.active.id));
      }}
      // Hold an app over another icon's centre for a moment to make (or join) a folder, like iOS.
      onDragMove={({ active: a, over, delta, activatorEvent }) => {
        const dragging = entries.find(x => x.id === a.id);
        if (!over || over.id === a.id || isFolder(dragging)) return merge && clearMerge();
        const start = pointOf(activatorEvent);
        const p = { x: start.x + delta.x, y: start.y + delta.y };
        const r = over.rect;
        const near = Math.hypot(p.x - (r.left + r.width / 2), p.y - (r.top + settings.iconSize / 2)) < settings.iconSize * 0.4;
        if (!near) return (merge || dwell.current.id) && clearMerge();
        if (dwell.current.id === over.id) return;
        clearTimeout(dwell.current.t);
        dwell.current = { id: over.id, t: setTimeout(() => setMerge(over.id), 360) };
      }}
      onDragCancel={end}
      onDragEnd={({ active: a, over, delta }) => {
        const target = merge;
        end();
        // A touch hold that never moved is a long-press: show the peek card instead of moving anything.
        if (Math.hypot(delta.x, delta.y) < 8) {
          const entry = entries.find(x => x.id === a.id);
          const el = elementOf(a.id);
          if (entry && el) isFolder(entry) ? onOpenFolder(entry, el) : onPeek(entry, el);
          return;
        }
        if (target && target !== a.id) return onMerge(a.id, target, ids);
        if (over && a.id !== over.id) onReorder(arrayMove(ids, ids.indexOf(a.id), ids.indexOf(over.id)));
      }}
    >
      <SortableContext items={ids} strategy={merge ? () => null : rectSortingStrategy}>
        <section
          aria-label="Apps"
          // A drop must never also count as a click on the icon underneath.
          onClickCapture={e => dragged.current && (e.preventDefault(), e.stopPropagation())}
          onContextMenuCapture={e => active && (e.preventDefault(), e.stopPropagation())}
          className="mx-auto grid max-w-[980px] gap-x-2 gap-y-7 sm:gap-x-3"
          style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))` }}
        >
          <AnimatePresence mode="popLayout" initial={first}>
            {entries.map((entry, n) => (
              <SortableEntry
                key={entry.id}
                entry={entry}
                index={n}
                first={first}
                layoutKey={layoutKey}
                settings={settings}
                jiggle={!!active && active.id !== entry.id}
                mergeTarget={merge === entry.id}
                pulse={pulse}
                jobs={jobs}
                onPeek={onPeek}
                onOpen={onOpenFolder}
                onPressPeek={(item, el) => {
                  dragged.current = true;
                  onPeek(item, el);
                  setTimeout(() => (dragged.current = false), 400);
                }}
              />
            ))}
          </AnimatePresence>
        </section>
      </SortableContext>
      <DragOverlay dropAnimation={merge ? null : { duration: 260, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }}>
        {active && (
          <div
            className={`flex flex-col items-center gap-2 drop-shadow-[0_18px_24px_rgb(0_0_0/0.45)] transition-transform duration-200 ${merge ? 'scale-90 opacity-90' : 'scale-110'}`}
          >
            {isFolder(active) ? (
              <div className="glass rounded-[23%]" style={{ width: settings.iconSize, height: settings.iconSize }} />
            ) : (
              <AppIcon item={active} overrides={settings.overrides} size={settings.iconSize} />
            )}
            {settings.showLabels && (
              <span className="label text-[13px] font-medium">{isFolder(active) ? active.name : nameOf(active, settings.overrides)}</span>
            )}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
