// Validates viking.manifest.json against the library's public API surface.
// Usage: npm run check:viking-upstream
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.join(dirname, '..', 'projects', 'viking-ui', 'viking.manifest.json');
const publicApiPath = path.join(dirname, '..', 'projects', 'viking-ui', 'src', 'public-api.ts');

const starExportPattern = /export\s+\*\s+from\s+'\.\/lib\/([^']+)'/g;

const main = async () => {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const publicApi = await readFile(publicApiPath, 'utf8');

  const manifestExports = new Set();
  for (const entry of Object.values(manifest.components)) {
    for (const name of entry.exports ?? []) {
      manifestExports.add(name);
    }
  }

  const publicExports = new Set();
  const starModules = [...publicApi.matchAll(starExportPattern)].map(match => match[1]);
  for (const block of publicApi.matchAll(/export\s+(?:type\s+)?\{([^}]+)\}/g)) {
    for (const part of block[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (name) publicExports.add(name);
    }
  }

  // Star exports re-export everything from component modules listed in public-api.ts.
  const libRoot = path.join(dirname, '..', 'projects', 'viking-ui', 'src', 'lib');
  for (const modulePath of starModules) {
    const base = path.join(libRoot, modulePath);
    const candidates = [`${base}.ts`, path.join(base, `${path.basename(modulePath)}.ts`)];
    let source = '';
    for (const candidate of candidates) {
      try {
        source = await readFile(candidate, 'utf8');
        break;
      } catch {
        /* try next */
      }
    }
    if (!source) continue;
    for (const match of source.matchAll(/export\s+(?:class|type|const|function)\s+(Viking\w+)/g)) {
      publicExports.add(match[1]);
    }
  }

  const isComponentExport = name => /^Viking[A-Z]/.test(name);
  const manifestComponentExports = new Set([...manifestExports].filter(isComponentExport));
  const publicComponentExports = new Set([...publicExports].filter(isComponentExport));

  const missingFromManifest = [...publicComponentExports].filter(name => !manifestComponentExports.has(name));

  console.log(`Manifest component exports: ${manifestComponentExports.size}`);
  console.log(`Public API component exports: ${publicComponentExports.size}`);

  if (missingFromManifest.length > 0) {
    console.warn('\nPublic API exports missing from viking.manifest.json:');
    for (const name of missingFromManifest.sort()) {
      console.warn(` + ${name}`);
    }
  }
  if (missingFromManifest.length === 0) {
    console.log('\nviking-ui manifest covers the public API component surface.');
  }
  process.exit(missingFromManifest.length > 0 ? 1 : 0);
};

try {
  await main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
