// Builds static site-chrome JSON + viking-icon-paths for marketing/backend widgets.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.join(dirname, '..');
const rootDir = path.join(frontendDir, '..');
const vikingUiDir = path.join(frontendDir, 'projects', 'viking-ui', 'src', 'lib');

/** Hardcoded extractors — avoids dynamic RegExp (Semgrep ReDoS rule). */
const EXPORT_ARRAY_PATTERNS = {
  SITE_NAV_LINKS: /export const SITE_NAV_LINKS[\s\S]*?= (\[[\s\S]*?\]) as const/,
  SITE_FOOTER_COLUMNS: /export const SITE_FOOTER_COLUMNS[\s\S]*?= (\[[\s\S]*?\]) as const/,
};

const readJsonFromTsExport = (filePath, exportName) => {
  const pattern = EXPORT_ARRAY_PATTERNS[exportName];
  if (!pattern) {
    throw new Error(`No extractor registered for ${exportName}`);
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(pattern);
  if (!match) {
    throw new Error(`Could not extract ${exportName} from ${filePath}`);
  }
  return Function(`"use strict"; return (${match[1]});`)();
};

const siteChromeConfigPath = path.join(vikingUiDir, 'site-chrome', 'site-chrome.config.ts');
const iconsPath = path.join(vikingUiDir, 'core', 'icons.ts');

const siteChrome = {
  navLinks: readJsonFromTsExport(siteChromeConfigPath, 'SITE_NAV_LINKS'),
  footerColumns: readJsonFromTsExport(siteChromeConfigPath, 'SITE_FOOTER_COLUMNS'),
  defaultUrls: {
    app: 'https://deml.app',
    marketing: 'https://dataengineeringformachinelearning.com',
    backend: 'https://backend.deml.app',
  },
};

const iconsContent = fs.readFileSync(iconsPath, 'utf8');
const iconsMatch = iconsContent.match(/export const VIKING_ICON_PATHS = (\{[\s\S]*?\}) as const/);
if (!iconsMatch) {
  throw new Error('Could not extract VIKING_ICON_PATHS');
}
const iconPaths = Function(`"use strict"; return (${iconsMatch[1]});`)();

const outputs = [
  path.join(frontendDir, 'public', 'assets', 'site-chrome.json'),
  path.join(frontendDir, 'src', 'assets', 'site-chrome.json'),
  path.join(rootDir, 'marketing', 'public', 'assets', 'site-chrome.json'),
  path.join(rootDir, 'backend', 'static', 'site-chrome.json'),
];

const iconOutputs = [
  path.join(frontendDir, 'public', 'assets', 'viking-icon-paths.json'),
  path.join(frontendDir, 'src', 'assets', 'viking-icon-paths.json'),
  path.join(rootDir, 'marketing', 'public', 'assets', 'viking-icon-paths.json'),
  path.join(rootDir, 'backend', 'static', 'viking-icon-paths.json'),
];

for (const out of outputs) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(siteChrome, null, 2)}\n`);
}

for (const out of iconOutputs) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(iconPaths, null, 2)}\n`);
}

console.log('Wrote site-chrome.json and viking-icon-paths.json to frontend, marketing, and backend assets.');
