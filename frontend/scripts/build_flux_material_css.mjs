// Compiles flux-material.scss (+ app shell styles) into a static CSS bundle for
// marketing, backend templates, and widgets that cannot import Angular components.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.join(dirname, '..');
const outDir = path.join(frontendDir, 'dist', 'flux-material-css');
const outFile = path.join(outDir, 'flux-material.css');

const entryScss = path.join(frontendDir, 'projects', 'flux-material', 'src', 'styles', 'flux-material-bundle.scss');

fs.mkdirSync(outDir, { recursive: true });

execSync(`npx sass "${entryScss}" "${outFile}" --no-source-map --style=compressed`, {
  cwd: frontendDir,
  stdio: 'inherit',
});

console.log(`Wrote ${outFile}`);
