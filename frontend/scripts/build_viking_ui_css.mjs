// Deprecated: static CSS is built by packages/viking-ui.
// Kept as a thin redirect for scripts that still reference this path.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../packages/viking-ui',
);
const result = spawnSync('npm', ['run', 'build'], {
  cwd: packageDir,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
