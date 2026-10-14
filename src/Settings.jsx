import { useRef } from 'react';
import { motion } from 'motion/react';
import { Download, RotateCcw, Upload, X } from 'lucide-react';
import { AppIcon, nameOf } from './ui';
import { SORTS, WALLPAPERS, shrinkImage } from './prefs';

const Section = ({ title, children }) => (
  <section className="space-y-3 border-t border-white/10 px-5 py-4 first:border-t-0">
    <h3 className="text-[12px] font-semibold text-white/55">{title}</h3>
    {children}
  </section>
);

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-[14px]">
      {label}
      <span className="relative inline-flex">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="peer sr-only" />
        <span className="h-[26px] w-[44px] rounded-full bg-white/20 transition-colors duration-200 peer-checked:bg-up peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-white" />
        <span className="absolute left-[3px] top-[3px] size-5 rounded-full bg-white shadow transition-transform duration-200 ease-spring peer-checked:translate-x-[18px]" />
      </span>
    </label>
  );
}

function Slider({ label, value, min, max, step = 1, format = v => v, onChange }) {
  return (
    <label className="block text-[14px]">
      <span className="flex justify-between">
        {label}
        <span className="tabular-nums text-white/60">{format(value)}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} className="mt-2 w-full accent-white" />
    </label>
  );
}

const field =
  'w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-[14px] text-white outline-none placeholder:text-white/40 focus:border-white/50';

export default function Settings({ settings, update, reset, replace, items, onClose, notify, onGroup }) {
  const fileRef = useRef(null);
  const importRef = useRef(null);
  const hidden = items.filter(i => settings.hidden.includes(i.id));
  const customised = items.filter(i => settings.overrides[i.id]);

  const uploadWallpaper = async file => {
    if (!file) return;
    try {
      update({ customWallpaper: await shrinkImage(file, 2560), wallpaper: 'custom' });
    } catch {
      notify('That image could not be read');
    }
  };
  const exportSettings = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' }));
    a.download = 'launchpad-settings.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importSettings = async file => {
    try {
      replace(JSON.parse(await file.text()));
      notify('Settings imported');
    } catch {
      notify('That file is not a Launchpad settings export');
    }
  };

  return (
    <div className="fixed inset-0 z-40" onPointerDown={e => e.target === e.currentTarget && onClose()}>
      <motion.aside
        role="dialog"
        aria-label="Customise"
        initial={{ x: '105%' }}
        animate={{ x: 0 }}
        exit={{ x: '105%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 38 }}
        className="glass glass-dark absolute bottom-3 right-3 top-3 !bg-[rgb(28_28_33/0.94)] flex w-[min(380px,calc(100vw-24px))] flex-col overflow-hidden rounded-[28px]"
      >
        <header className="flex items-center justify-between px-5 pb-2 pt-4">
          <h2 className="text-[17px] font-semibold">Customise</h2>
          <button onClick={onClose} aria-label="Close" className="grid size-8 place-items-center rounded-full bg-white/10 hover:bg-white/20">
            <X className="size-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain pb-4">
          <Section title="Wallpaper">
            <div className="grid grid-cols-4 gap-2">
              {WALLPAPERS.map(w => (
                <button
                  key={w.id}
                  title={w.label}
                  onClick={() => update({ wallpaper: w.id })}
                  className={`aspect-[4/3] rounded-xl bg-cover bg-center ring-2 ring-offset-2 ring-offset-transparent transition ${settings.wallpaper === w.id ? 'ring-white' : 'ring-transparent hover:ring-white/40'}`}
                  style={{ backgroundImage: `url(/wallpapers/${w.id}.webp)` }}
                />
              ))}
              <button
                title="Upload your own"
                onClick={() => (settings.customWallpaper && settings.wallpaper !== 'custom' ? update({ wallpaper: 'custom' }) : fileRef.current.click())}
                className={`grid aspect-[4/3] place-items-center rounded-xl bg-white/10 bg-cover bg-center ring-2 ring-offset-2 ring-offset-transparent transition ${settings.wallpaper === 'custom' ? 'ring-white' : 'ring-transparent hover:ring-white/40'}`}
                style={settings.customWallpaper ? { backgroundImage: `url(${settings.customWallpaper})` } : undefined}
              >
                {!settings.customWallpaper && <Upload className="size-4" />}
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => fileRef.current.click()}
                className="shrink-0 whitespace-nowrap rounded-full bg-white/10 px-3 py-1.5 text-[13px] hover:bg-white/20"
              >
                Upload image
              </button>
              <input
                placeholder="…or paste an image URL"
                defaultValue={settings.customWallpaper.startsWith('http') ? settings.customWallpaper : ''}
                onKeyDown={e => e.key === 'Enter' && e.currentTarget.value && update({ customWallpaper: e.currentTarget.value, wallpaper: 'custom' })}
                className={`${field} py-1.5 text-[13px]`}
              />
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => uploadWallpaper(e.target.files[0])} />
            <Slider
              label="Dim wallpaper"
              value={settings.dim}
              min={0}
              max={0.6}
              step={0.05}
              format={v => `${Math.round(v * 100)}%`}
              onChange={dim => update({ dim })}
            />
          </Section>

          <Section title="Glass">
            <Slider label="Blur" value={settings.glassBlur} min={0} max={60} format={v => `${v}px`} onChange={glassBlur => update({ glassBlur })} />
            <Slider
              label="Frost"
              value={settings.glassTint}
              min={0}
              max={0.5}
              step={0.01}
              format={v => `${Math.round(v * 200)}%`}
              onChange={glassTint => update({ glassTint })}
            />
          </Section>

          <Section title="Home screen">
            <label className="block text-[14px]">
              Your name
              <input value={settings.name} onChange={e => update({ name: e.target.value })} placeholder="Shown in the greeting" className={`${field} mt-2`} />
            </label>
            <Toggle label="Greeting" checked={settings.showGreeting} onChange={showGreeting => update({ showGreeting })} />
            <Toggle label="Search bar" checked={settings.showSearch} onChange={showSearch => update({ showSearch })} />
            <Toggle label="Health widget" checked={settings.widgets.health} onChange={v => update(s => ({ widgets: { ...s.widgets, health: v } }))} />
            <Toggle label="Instance widget" checked={settings.widgets.instance} onChange={v => update(s => ({ widgets: { ...s.widgets, instance: v } }))} />
            <Toggle
              label="Needs attention widget"
              checked={settings.widgets.attention}
              onChange={v => update(s => ({ widgets: { ...s.widgets, attention: v } }))}
            />
            <Toggle label="Dock" checked={settings.showDock} onChange={showDock => update({ showDock })} />
            <Toggle label="Magnify dock on hover" checked={settings.magnify} onChange={magnify => update({ magnify })} />
          </Section>

          <Section title="Apps">
            <Slider label="Icon size" value={settings.iconSize} min={52} max={112} format={v => `${v}px`} onChange={iconSize => update({ iconSize })} />
            <Toggle label="App names" checked={settings.showLabels} onChange={showLabels => update({ showLabels })} />
            <Toggle label="Stopped apps" checked={settings.showStopped} onChange={showStopped => update({ showStopped })} />
            <Toggle label="Services" checked={settings.showServices} onChange={showServices => update({ showServices })} />
            <label className="flex items-center justify-between gap-3 text-[14px]">
              Sort by
              <select value={settings.sort} onChange={e => update({ sort: e.target.value })} className={`${field} w-auto py-1.5`}>
                {SORTS.map(s => (
                  <option key={s.id} value={s.id} className="bg-neutral-900">
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <Slider
              label="Refresh every"
              value={settings.refreshSeconds}
              min={15}
              max={300}
              step={15}
              format={v => `${v}s`}
              onChange={refreshSeconds => update({ refreshSeconds })}
            />
          </Section>

          <Section title="Folders">
            <p className="text-[13px] text-white/60">Drag an app onto another and hold to make a folder.</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  onGroup();
                  notify('Grouped apps by Coolify project');
                }}
                className="rounded-full bg-white/10 px-3 py-1.5 text-[13px] hover:bg-white/20"
              >
                Group by project
              </button>
              {Object.keys(settings.folders).length > 0 && (
                <button onClick={() => update({ folders: {} })} className="rounded-full bg-white/10 px-3 py-1.5 text-[13px] hover:bg-white/20">
                  Remove all folders ({Object.keys(settings.folders).length})
                </button>
              )}
            </div>
          </Section>

          {(hidden.length > 0 || customised.length > 0) && (
            <Section title="Hidden and customised apps">
              {[...new Set([...hidden, ...customised])].map(i => (
                <div key={i.id} className="flex items-center gap-3">
                  <AppIcon item={i} overrides={settings.overrides} size={32} />
                  <span className="min-w-0 flex-1 truncate text-[14px]">{nameOf(i, settings.overrides)}</span>
                  {settings.hidden.includes(i.id) && (
                    <button
                      onClick={() => update(s => ({ hidden: s.hidden.filter(x => x !== i.id) }))}
                      className="rounded-full bg-white/10 px-2.5 py-1 text-[12px] hover:bg-white/20"
                    >
                      Show
                    </button>
                  )}
                  {settings.overrides[i.id] && (
                    <button
                      onClick={() =>
                        update(s => {
                          const { [i.id]: _, ...rest } = s.overrides;
                          return { overrides: rest };
                        })
                      }
                      className="rounded-full bg-white/10 px-2.5 py-1 text-[12px] hover:bg-white/20"
                    >
                      Reset
                    </button>
                  )}
                </div>
              ))}
            </Section>
          )}

          <Section title="Backup">
            <div className="flex flex-wrap gap-2">
              <button onClick={exportSettings} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[13px] hover:bg-white/20">
                <Download className="size-3.5" /> Export
              </button>
              <button
                onClick={() => importRef.current.click()}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[13px] hover:bg-white/20"
              >
                <Upload className="size-3.5" /> Import
              </button>
              <button
                onClick={() => {
                  if (confirm('Reset every Launchpad setting in this browser?')) reset();
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-down/25 px-3 py-1.5 text-[13px] hover:bg-down/40"
              >
                <RotateCcw className="size-3.5" /> Reset all
              </button>
              <input ref={importRef} type="file" accept="application/json" hidden onChange={e => e.target.files[0] && importSettings(e.target.files[0])} />
            </div>
            <p className="text-[12px] text-white/50">Settings are saved in this browser. Export them to move to another device.</p>
          </Section>
        </div>
      </motion.aside>
    </div>
  );
}
