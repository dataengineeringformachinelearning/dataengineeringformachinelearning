// Deprecated: static CSS is built by viking-ui-docs/scripts/build-static-css.mjs
// Kept as a thin redirect for scripts that still reference this path.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const docsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../viking-ui-docs');
const result = spawnSync('npm', ['run', 'build:static-css'], {
  cwd: docsDir,
  stdio: 'inherit',
  shell: true,
});

process.exit(result.status ?? 1);
