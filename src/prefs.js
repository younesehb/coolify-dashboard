import { useEffect, useState } from 'react';

// Per-browser preferences. Everything the viewer can customise lives here.
const KEY = 'launchpad.settings.v1';

export const WALLPAPERS = [
  { id: 'beach', label: 'Black sand beach' },
  { id: 'lake', label: 'Alpine lake' },
  { id: 'dunes', label: 'Dunes' }
];

export const SORTS = [
  { id: 'custom', label: 'My order' },
  { id: 'name', label: 'A–Z' },
  { id: 'status', label: 'Status' },
  { id: 'recent', label: 'Recent' },
  { id: 'project', label: 'Project' }
];

export const DEFAULTS = {
  name: '',
  showGreeting: true,
  showSearch: true,
  wallpaper: 'beach',
  customWallpaper: '',
  dim: 0.15,
  glassBlur: 26,
  glassTint: 0.17,
  iconSize: 76,
  showLabels: true,
  widgets: {
    server: true,
    network: true,
    system: true,
    coolify: true,
    attention: true,
    deployments: true,
    containers: true,
    health: false,
    storage: false,
    memory: false,
    instance: false
  },
  showStopped: true,
  showServices: true,
  sort: 'custom',
  order: [],
  hidden: [],
  overrides: {},
  folders: {},
  links: [],
  showDock: true,
  magnify: true,
  refreshSeconds: 60,
  dragTip: true
};

const read = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { ...DEFAULTS, ...raw, widgets: { ...DEFAULTS.widgets, ...raw.widgets } };
  } catch {
    return DEFAULTS;
  }
};

export function useSettings(onSaveError) {
  const [settings, setSettings] = useState(read);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      onSaveError?.();
    }
  }, [settings]);
  const update = patch => setSettings(prev => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }));
  const reset = () => setSettings(DEFAULTS);
  const replace = next => setSettings({ ...DEFAULTS, ...next, widgets: { ...DEFAULTS.widgets, ...next.widgets } });
  return [settings, update, reset, replace];
}

// Downscale an uploaded image so it fits comfortably in localStorage.
export const shrinkImage = (file, max, type = 'image/jpeg') =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL(type, 0.86));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
