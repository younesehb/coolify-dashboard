import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { DndContext, DragOverlay, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AppIcon, nameOf } from './ui';
import { Tile, sensorsConfig, useSmall } from './Grid';

function Member({ item, ...rest }) {
  const { listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  return (
    <div
      ref={setNodeRef}
      data-entry={item.id}
      style={{ transform: CSS.Translate.toString(transform), transition, opacity: isDragging ? 0.25 : 1, touchAction: 'manipulation' }}
      {...listeners}
    >
      <Tile item={item} {...rest} />
    </div>
  );
}

// iOS-style open folder: rename in place, drag to rearrange, drag an app outside the panel to take it out.
export default function Folder({ folder, origin, settings: base, jobs, pulse, onClose, onRename, onReorder, onRemove, onPeek }) {
  const small = useSmall();
  const settings = small ? { ...base, iconSize: Math.round(base.iconSize * 0.8) } : base;
  const panel = useRef(null);
  const dragged = useRef(false);
  const [active, setActive] = useState(null);
  const [outside, setOutside] = useState(false);
  const sensors = useSensors(useSensor(...sensorsConfig[0]), useSensor(...sensorsConfig[1]));
  const ids = folder.apps.map(a => a.id);
  const pointer = (e, d) => {
    const t = e?.touches?.[0] || e;
    return { x: (t?.clientX ?? 0) + d.x, y: (t?.clientY ?? 0) + d.y };
  };
  const isOutside = p => {
    const r = panel.current?.getBoundingClientRect();
    return r && (p.x < r.left || p.x > r.right || p.y < r.top || p.y > r.bottom);
  };
  const origin_ = origin ? `${origin.x}px ${origin.y}px` : '50% 50%';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-40 grid place-items-center bg-black/30 px-4 backdrop-blur-md"
      style={{ transformOrigin: origin_ }}
      onPointerDown={e => e.target === e.currentTarget && onClose()}
      onKeyDown={e => e.key === 'Escape' && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.4 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        style={{ transformOrigin: origin_ }}
        className="w-full max-w-[560px]"
      >
        <input
          defaultValue={folder.name}
          onBlur={e => onRename(e.target.value.trim() || 'Folder')}
          onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
          aria-label="Folder name"
          className="label mx-auto mb-5 block w-full bg-transparent text-center text-[30px] font-bold tracking-tight text-white outline-none sm:text-[36px]"
        />
        <div ref={panel} className={`glass rounded-[40px] p-6 transition-shadow duration-200 sm:p-8 ${outside ? 'ring-2 ring-white/60' : ''}`}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={e => {
              dragged.current = true;
              setActive(folder.apps.find(a => a.id === e.active.id));
            }}
            onDragMove={({ activatorEvent, delta }) => setOutside(isOutside(pointer(activatorEvent, delta)))}
            onDragCancel={() => setActive(null)}
            onDragEnd={({ active: a, over, delta, activatorEvent }) => {
              setActive(null);
              setOutside(false);
              setTimeout(() => (dragged.current = false), 0);
              if (Math.hypot(delta.x, delta.y) < 8) {
                const el = document.querySelector(`[data-entry="${CSS.escape(a.id)}"] a, [data-entry="${CSS.escape(a.id)}"] button`);
                const item = folder.apps.find(x => x.id === a.id);
                return item && el && onPeek(item, el);
              }
              if (isOutside(pointer(activatorEvent, delta))) return onRemove(a.id);
              if (over && a.id !== over.id) onReorder(arrayMove(ids, ids.indexOf(a.id), ids.indexOf(over.id)));
            }}
          >
            <SortableContext items={ids} strategy={rectSortingStrategy}>
              <div
                className="grid gap-x-3 gap-y-6"
                style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${Math.max(72, settings.iconSize + 20)}px, 1fr))` }}
                onClickCapture={e => dragged.current && (e.preventDefault(), e.stopPropagation())}
              >
                {folder.apps.map((a, n) => (
                  <Member
                    key={a.id}
                    item={a}
                    index={n}
                    settings={settings}
                    job={jobs[a.id]}
                    pulse={pulse.has(a.id)}
                    jiggle={!!active && active.id !== a.id}
                    onPeek={onPeek}
                    onPressPeek={(item, el) => {
                      dragged.current = true;
                      onPeek(item, el);
                      setTimeout(() => (dragged.current = false), 400);
                    }}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay>
              {active && (
                <div className="flex scale-110 flex-col items-center gap-2 drop-shadow-[0_18px_24px_rgb(0_0_0/0.45)]">
                  <AppIcon item={active} overrides={settings.overrides} size={settings.iconSize} />
                  {settings.showLabels && <span className="label text-[13px] font-medium">{nameOf(active, settings.overrides)}</span>}
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>
        <p className="label mt-4 text-center text-[13px] text-white/80">Drag an app outside to take it out of the folder.</p>
      </motion.div>
    </motion.div>
  );
}
