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
  }))
];
