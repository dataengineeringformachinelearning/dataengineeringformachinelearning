// Post-build: Algolia Crawler expects /sitemap.xml (urlset), not only sitemap-index.xml.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(dirname, '..', 'dist');
const sitemap0 = path.join(distDir, 'sitemap-0.xml');
const sitemapXml = path.join(distDir, 'sitemap.xml');

if (!fs.existsSync(sitemap0)) {
  console.warn('postbuild: sitemap-0.xml missing — run astro build first');
  process.exit(0);
}

fs.copyFileSync(sitemap0, sitemapXml);
console.log(`postbuild: copied sitemap-0.xml → sitemap.xml`);