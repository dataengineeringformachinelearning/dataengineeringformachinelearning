/**
 * Bundles Viking-UI Web Components for framework-agnostic usage.
 * Output: viking-ui-elements.js (IIFE, auto-registers custom elements)
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgDir = path.join(dirname, '..');
const rootDir = path.join(pkgDir, '..', '..', '..');
const docsDir = path.join(rootDir, 'viking-ui-docs');
const outDir = path.join(docsDir, 'dist', 'static-css');
const entry = path.join(
  pkgDir,
  '..',
  '..',
  '..',
  'packages',
  'viking-ui',
  'src',
  'web',
  'index.ts',
);
const outFile = path.join(outDir, 'viking-ui-elements.js');

const esbuildCandidates = [
  path.join(rootDir, 'frontend', 'node_modules', '.bin', 'esbuild'),
  path.join(docsDir, 'node_modules', '.bin', 'esbuild'),
];
const esbuildBin = esbuildCandidates.find(candidate => fs.existsSync(candidate)) ?? 'esbuild';

fs.mkdirSync(outDir, { recursive: true });

execSync(
  `"${esbuildBin}" "${entry}" --bundle --format=iife --global-name=VikingUI --outfile="${outFile}" --target=es2022 --minify`,
  { cwd: pkgDir, stdio: 'inherit' },
);

console.log(`Wrote ${outFile}`);

// Mirror to docs public assets
const publicAssetsDir = path.join(docsDir, 'public', 'assets');
fs.mkdirSync(publicAssetsDir, { recursive: true });
fs.copyFileSync(outFile, path.join(publicAssetsDir, 'viking-ui-elements.js'));
