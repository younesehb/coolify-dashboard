// Sample data for DEMO=true: try Launchpad (and take screenshots) without a Coolify instance.
const now = Date.now();
const ago = h => new Date(now - h * 3600_000).toISOString();

const services = [
  ['n8n', 'n8n-with-postgres-and-worker', 'Workflow automation', 'running', 'healthy', 'Automation', 5],
  ['plausible', 'plausible', 'Privacy-friendly analytics', 'running', 'healthy', 'Marketing', 30],
  ['uptime-kuma', 'uptime-kuma', 'Status checks for every site', 'running', 'healthy', 'Monitoring', 70],
  ['ghost', 'ghost', 'Company blog', 'running', 'healthy', 'Marketing', 12],
  ['gitea', 'gitea', 'Self-hosted Git', 'running', 'healthy', 'Engineering', 200],
  ['umami', 'umami', 'Product analytics', 'running', 'unhealthy', 'Marketing', 3],
  ['supabase', 'supabase', 'Postgres, auth and storage', 'running', 'healthy', 'Engineering', 48],
  ['nextcloud', 'nextcloud', 'Team files', 'exited', null, 'Office', 400],
  ['vaultwarden', 'vaultwarden', 'Password manager', 'running', 'healthy', 'Office', 90],
  ['grafana', 'grafana', 'Dashboards and alerts', 'running', 'healthy', 'Monitoring', 20],
  ['minio', 'minio', 'S3-compatible object storage', 'running', 'healthy', 'Engineering', 150],
  ['metabase', 'metabase', 'Business intelligence', 'degraded', 'unhealthy', 'Office', 8],
  ['directus', 'directus', 'Headless CMS', 'running', 'healthy', 'Marketing', 60],
  ['pocketbase', 'pocketbase', 'Backend in one file', 'running', 'healthy', 'Engineering', 26]
];

const apps = [
  ['acme-web', 'Marketing site (Next.js)', 'running', 'healthy', 'Acme', 1, ['https://acme.example.com', 'https://www.acme.example.com']],
  ['acme-api', 'Public REST API', 'running', 'healthy', 'Acme', 2, ['https://api.acme.example.com']],
  ['acme-admin', 'Internal admin panel', 'running', 'healthy', 'Acme', 6, ['https://admin.acme.example.com']],
  ['docs', 'Product documentation', 'running', 'healthy', 'Acme', 18, ['https://docs.example.com']],
  ['status', 'Public status page', 'running', 'healthy', 'Monitoring', 100, ['https://status.example.com']],
  ['landing-v2', 'Experimental landing page', 'exited', null, 'Labs', 300, ['https://v2.example.com']],
  ['worker', 'Background jobs, no public domain', 'running', 'healthy', 'Acme', 4, []]
];

export const demoItems = logos => [
  ...apps.map(([name, description, state, health, project, h, urls], n) => ({
    id: `demo-app-${n}`,
    kind: 'app',
    name,
    description,
    urls,
    state,
    health,
    project,
    environment: n === 2 ? 'staging' : 'production',
    stack: n % 2 ? 'nixpacks' : 'dockerfile',
    repo: `https://github.com/example/${name}`,
    branch: 'main',
    updatedAt: ago(h),
    logo: null,
    manage: 'https://coolify.io/docs'
  })),
  ...services.map(([name, type, description, state, health, project, h], n) => ({
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
    logo: logos[type] ? `https://cdn.jsdelivr.net/gh/coollabsio/coolify@v4.x/public/${logos[type]}` : null,
    manage: 'https://coolify.io/docs'
  }))
];
