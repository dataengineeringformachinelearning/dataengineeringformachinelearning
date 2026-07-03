// Generates deml.app sitemap.xml from indexable public routes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.join(dirname, '..');
const siteUrl = 'https://deml.app';

/** Routes with robots: index,follow in page-meta.ts (plus known public status slugs). */
const INDEXABLE_PATHS = [
  { loc: '/', changefreq: 'daily', priority: '1.0' },
  { loc: '/login', changefreq: 'monthly', priority: '0.8' },
  { loc: '/explore', changefreq: 'daily', priority: '0.9' },
  { loc: '/status', changefreq: 'daily', priority: '0.8' },
  { loc: '/status/platform-status', changefreq: 'always', priority: '0.9' },
];

const urlEntry = ({ loc, changefreq, priority }) => `  <url>
    <loc>${siteUrl}${loc}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${INDEXABLE_PATHS.map(urlEntry).join('\n')}
</urlset>
`;

const sitemapIndexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${siteUrl}/sitemap.xml</loc>
  </sitemap>
</sitemapindex>
`;

const outputs = [
  path.join(frontendDir, 'public', 'sitemap.xml'),
  path.join(frontendDir, 'public', 'sitemap-index.xml'),
];

for (const out of outputs) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
}

fs.writeFileSync(outputs[0], sitemapXml);
fs.writeFileSync(outputs[1], sitemapIndexXml);
console.log(`Wrote ${outputs[0]} and ${outputs[1]} (${INDEXABLE_PATHS.length} URLs)`);
