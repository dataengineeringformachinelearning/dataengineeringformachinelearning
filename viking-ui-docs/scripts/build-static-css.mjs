/**
 * Builds static Viking-UI CSS artifacts for marketing, backend, and widgets.
 * Canonical build owner: viking-ui-docs (full monorepo context).
 * Run via: npm run build:static-css (also invoked by scripts/sync_design_system.py).
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.join(dirname, '..');
const rootDir = path.join(docsDir, '..');
const stylesDir = path.join(rootDir, 'frontend', 'projects', 'viking-ui', 'src', 'styles');
const outDir = path.join(docsDir, 'dist', 'static-css');
const publicAssetsDir = path.join(docsDir, 'public', 'assets');

const loadPath = stylesDir;
const sassBase = `npx sass --no-source-map --load-path="${loadPath}"`;

const builds = [
  {
    entry: path.join(stylesDir, 'tokens-export.scss'),
    out: path.join(outDir, 'design-tokens.css'),
    style: 'expanded',
  },
  {
    entry: path.join(stylesDir, 'deml-components.scss'),
    out: path.join(outDir, 'deml-components.css'),
    style: 'expanded',
  },
  {
    entry: path.join(stylesDir, 'viking-ui-bundle.scss'),
    out: path.join(outDir, 'viking-ui.css'),
    style: 'compressed',
  },
];

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(publicAssetsDir, { recursive: true });

for (const { entry, out, style } of builds) {
  execSync(`${sassBase} --style=${style} "${entry}" "${out}"`, {
    cwd: docsDir,
    stdio: 'inherit',
  });
  console.log(`Wrote ${out}`);
}

for (const name of ['design-tokens.css', 'deml-components.css', 'viking-ui.css']) {
  fs.copyFileSync(path.join(outDir, name), path.join(publicAssetsDir, name));
}
