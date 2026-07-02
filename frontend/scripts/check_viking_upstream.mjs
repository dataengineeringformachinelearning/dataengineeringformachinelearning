// Compares the viking-ui manifest against the live fluxui.dev component
// index so upstream additions, renames, or removals are detected early.
// Usage: npm run check:viking-upstream
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.join(dirname, '..', 'projects', 'viking-ui', 'viking.manifest.json');

const main = async () => {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const tracked = new Set(Object.keys(manifest.components));

  let html = '';
  try {
    const response = await fetch(manifest.upstream.componentsIndex, {
      headers: { 'user-agent': 'deml-viking-ui-sync-check' },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    html = await response.text();
  } catch (error) {
    console.error(`Unable to reach ${manifest.upstream.componentsIndex}: ${error.message}`);
    console.error('Skipping upstream diff (offline?). Manifest remains authoritative.');
    process.exit(0);
  }

  const upstream = new Set(
    [...html.matchAll(/href="\/components\/([a-z0-9-]+)"/g)].map(match => match[1]),
  );

  // Paid/unsupported upstream entries we intentionally do not track.
  const ignored = new Set(['table', 'tabs', 'toggle', 'tab']);

  const missing = [...upstream].filter(name => !tracked.has(name) && !ignored.has(name));
  const removed = [...tracked].filter(name => !upstream.has(name));

  console.log(`Upstream components discovered: ${upstream.size}`);
  console.log(`Tracked in viking-ui:       ${tracked.size}`);

  if (missing.length > 0) {
    console.warn(`\nNew upstream components not yet in viking-ui:`);
    for (const name of missing) {
      console.warn(` + ${name} -> https://fluxui.dev/components/${name}`);
    }
  }
  if (removed.length > 0) {
    console.warn(`\nTracked components no longer listed upstream:`);
    for (const name of removed) {
      console.warn(` - ${name}`);
    }
  }
  if (missing.length === 0 && removed.length === 0) {
    console.log('\nviking-ui is in sync with the upstream Viking UI component index.');
  }
  process.exit(missing.length > 0 ? 1 : 0);
};

try {
  await main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
