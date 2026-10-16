// Sample data for DEMO=true: try Launchpad (and take screenshots) without a Coolify instance.
// Logos come from Simple Icons in brand colours; a few too pale for a white tile get a darker tint.
const now = Date.now();
const ago = h => new Date(now - h * 3600_000).toISOString();
const icon = (slug, color) => `https://cdn.simpleicons.org/${slug}${color ? `/${color}` : ''}`;

// name, description, state, health, project, hours since update, domains, logo, stack
const apps = [
  [
    'storefront',
    'Shop front end (Next.js)',
    'running',
    'healthy',
    'Acme',
    1,
    ['https://shop.example.com', 'https://www.shop.example.com'],
    icon('nextdotjs'),
    'nixpacks'
  ],
  ['api', 'Public REST API (NestJS)', 'running', 'healthy', 'Acme', 2, ['https://api.example.com'], icon('nestjs'), 'dockerfile'],
  ['admin', 'Internal admin panel (React)', 'running', 'healthy', 'Acme', 6, ['https://admin.example.com'], icon('react', '149ECA'), 'nixpacks'],
  ['docs', 'Product documentation (Docusaurus)', 'running', 'healthy', 'Acme', 18, ['https://docs.example.com'], icon('docusaurus'), 'static'],
  ['blog', 'Engineering blog (Astro)', 'running', 'healthy', 'Marketing', 30, ['https://blog.example.com'], icon('astro'), 'static'],
  ['landing-v2', 'Experimental landing page (SvelteKit)', 'exited', null, 'Labs', 300, ['https://v2.example.com'], icon('svelte'), 'nixpacks'],
  ['worker', 'Background jobs, no public domain (Bun)', 'running', 'healthy', 'Acme', 4, [], icon('bun', '14151A'), 'dockerfile']
];

const services = [
  ['n8n', 'n8n-with-postgres-and-worker', 'Workflow automation', 'running', 'healthy', 'Automation', 5, icon('n8n')],
  ['plausible', 'plausible', 'Privacy-friendly analytics', 'running', 'healthy', 'Marketing', 30, icon('plausibleanalytics')],
  ['uptime-kuma', 'uptime-kuma', 'Status checks for every site', 'running', 'healthy', 'Monitoring', 70, icon('uptimekuma', '3BB273')],
  ['ghost', 'ghost', 'Company newsletter', 'running', 'healthy', 'Marketing', 12, icon('ghost')],
  ['gitea', 'gitea', 'Self-hosted Git', 'running', 'healthy', 'Engineering', 200, icon('gitea')],
  ['umami', 'umami', 'Product analytics', 'running', 'unhealthy', 'Marketing', 3, icon('umami')],
  ['supabase', 'supabase', 'Postgres, auth and storage', 'running', 'healthy', 'Engineering', 48, icon('supabase')],
  ['nextcloud', 'nextcloud', 'Team files', 'exited', null, 'Office', 400, icon('nextcloud')],
  ['vaultwarden', 'vaultwarden', 'Password manager', 'running', 'healthy', 'Office', 90, icon('vaultwarden')],
  ['grafana', 'grafana', 'Dashboards and alerts', 'running', 'healthy', 'Monitoring', 20, icon('grafana')],
  ['minio', 'minio', 'S3-compatible object storage', 'running', 'healthy', 'Engineering', 150, icon('minio')],
  ['metabase', 'metabase', 'Business intelligence', 'degraded', 'unhealthy', 'Office', 8, icon('metabase')],
  ['directus', 'directus', 'Headless CMS', 'running', 'healthy', 'Marketing', 60, icon('directus')],
  ['pocketbase', 'pocketbase', 'Backend in one file', 'running', 'healthy', 'Engineering', 26, icon('pocketbase', '16161A')]
];

const databases = [
  ['postgres-main', 'Primary database for the shop and API', 'running', 'healthy', 'Acme', 50, 'postgresql'],
  ['redis-cache', 'Sessions and job queue', 'running', 'healthy', 'Acme', 50, 'redis'],
  ['clickhouse-events', 'Event warehouse for analytics', 'running', 'healthy', 'Marketing', 120, 'clickhouse']
];

export const demoItems = () => [
  ...apps.map(([name, description, state, health, project, h, urls, logo, stack], n) => ({
    id: `demo-app-${n}`,
    kind: 'app',
    name,
    description,
    urls,
    state,
    health,
    project,
    environment: name === 'admin' ? 'staging' : 'production',
    stack,
    repo: `https://github.com/example/${name}`,
    branch: 'main',
    updatedAt: ago(h),
    logo,
    manage: 'https://coolify.io/docs'
  })),
  ...services.map(([name, type, description, state, health, project, h, logo], n) => ({
    id: `demo-svc-${n}`,
    kind: 'service',
    name,
    description,
    urls: [`https://${name}.example.com`],
    state,
    health,
    project,
    environment: 'production',
    stack: type,
    repo: null,
    updatedAt: ago(h),
    logo,
    manage: 'https://coolify.io/docs'
  })),
  ...databases.map(([name, description, state, health, project, h, type], n) => ({
    id: `demo-db-${n}`,
    kind: 'database',
    name,
    description,
    urls: [],
    state,
    health,
    project,
    environment: 'production',
    stack: type,
    repo: null,
    updatedAt: ago(h),
    logo: icon(type),
    manage: 'https://coolify.io/docs'
  }))
];

// Recent deployments, in the shape /api/coolify returns.
export const demoCoolify = () => {
  const t = Date.now();
  const at = min => new Date(t - min * 60_000).toISOString();
  const commits = [
    'Add checkout analytics',
    'Fix image cache headers',
    'Bump dependencies',
    'Docs: deploy guide',
    'Tune worker concurrency',
    'New pricing page',
    'Fix login redirect',
    'Upgrade to Node 22'
  ];
  const apps = ['storefront', 'api', 'docs', 'blog', 'worker', 'storefront', 'admin', 'api'];
  const running =
    Math.floor(t / 60_000) % 3 === 0
      ? [{ id: 'demo-run', app: 'api', status: 'in_progress', at: at(1), updated: at(0), commit: 'Rate limit public endpoints', webhook: true }]
      : [];
  return {
    version: '4.0.0',
    projects: 6,
    servers: [{ name: 'atlas', reachable: true }],
    counts: { apps: apps.length - 1, services: services.length, databases: databases.length },
    running,
    recent: apps.map((app, n) => ({
      id: `demo-dep-${n}`,
      app,
      status: n === 3 ? 'failed' : 'finished',
      at: at(12 + n * 97),
      updated: at(10 + n * 97),
      commit: commits[n],
      webhook: n % 3 !== 2
    }))
  };
};

// Containers for the browser: one per app, a few per service, one per database, with drifting stats.
export const demoContainers = () => {
  const t = Date.now() / 1000;
  const items = demoItems();
  const extra = {
    n8n: ['worker', 'postgres'],
    supabase: ['kong', 'auth', 'rest', 'realtime', 'storage', 'db'],
    plausible: ['clickhouse', 'db'],
    ghost: ['mysql'],
    umami: ['db']
  };
  const list = [];
  items.forEach((i, n) => {
    const parts = [i.kind === 'service' ? i.name : null, ...(extra[i.name] || [])].filter(Boolean);
    (parts.length ? parts : [null]).forEach((part, k) => {
      const seed = n * 7 + k * 3;
      const up = i.state === 'running' || i.state === 'degraded';
      const wave = (a, p) => a * (1 + Math.sin(t / p + seed));
      list.push({
        id: ((seed * 2654435761) >>> 0).toString(16).padStart(12, 'a').slice(0, 12),
        name: part ? `${part}-${i.id}` : `${i.id}-${(seed * 97).toString(36)}`,
        image: i.kind === 'database' ? `${i.stack}:16` : part ? `${part}:latest` : `${i.name}:main`,
        state: up ? 'running' : 'exited',
        status: up ? `Up ${2 + (seed % 20)} days${i.health === 'unhealthy' && k === 0 ? ' (unhealthy)' : ' (healthy)'}` : 'Exited (0) 3 days ago',
        created: Date.now() - (2 + (seed % 30)) * 86400_000,
        project: i.project,
        environment: i.environment,
        resource: i.name,
        service: part,
        coolify: true,
        ...(up
          ? {
              cpu: Math.round((wave(4, 9 + (seed % 7)) + (seed % 5)) * 10) / 10,
              mem: (60 + (seed % 9) * 45 + wave(20, 30)) * 2 ** 20,
              memLimit: 32 * 2 ** 30,
              rx: wave(40_000 + (seed % 6) * 30_000, 5 + (seed % 4)),
              tx: wave(15_000 + (seed % 5) * 20_000, 7 + (seed % 3)),
              rxTotal: (1 + seed) * 3.2e8,
              txTotal: (1 + seed) * 1.1e8,
              blockRead: (2 + seed) * 4e7,
              blockWrite: (1 + seed) * 2e7,
              pids: 4 + (seed % 30)
            }
          : {})
      });
    });
  });
  return list;
};
