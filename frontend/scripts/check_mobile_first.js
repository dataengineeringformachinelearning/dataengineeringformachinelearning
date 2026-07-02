const fs = require('fs');
const path = require('path');

const SCAN_DIRS = [
  path.resolve(__dirname, '../src'),
  path.resolve(__dirname, '../../marketing/src/styles'),
  path.resolve(__dirname, '../../marketing/src/components'),
  path.resolve(__dirname, '../../marketing/src/pages'),
  path.resolve(__dirname, '../../marketing/src/layouts'),
];

// Generated bundles may minify entire files onto one line; property names like
// max-width must not be mistaken for @media (max-width: …) breakpoints.
const GENERATED_CSS = /(?:^|\/)(?:viking-ui|deml-components|design-tokens)\.css$/;

// Desktop-first breakpoint: @media … (max-width: …) — not layout max-width properties.
const DESKTOP_FIRST_MEDIA = /@media[^{]*\([^)]*\bmax-width\s*:/i;

function getFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
    const filePath = path.join(dir, path.basename(file));
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getFiles(filePath, fileList);
    } else if (file.endsWith('.css') || file.endsWith('.scss')) {
      if (!GENERATED_CSS.test(filePath)) {
        fileList.push(filePath);
      }
    }
  }
  return fileList;
}

let violationsCount = 0;
const files = SCAN_DIRS.flatMap(dir => (fs.existsSync(dir) ? getFiles(dir) : []));

console.log(`Scanning ${files.length} stylesheet files for mobile-first media queries...`);

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    if (DESKTOP_FIRST_MEDIA.test(line)) {
      const relativePath = path.relative(path.resolve(__dirname, '..'), file);
      console.error(`\x1b[31mViolation found in ${relativePath}:${index + 1}\x1b[0m`);
      console.error(`  Line: ${line.trim()}`);
      console.error(
        `  Hint: Avoid desktop-first 'max-width' media queries. Design mobile-first using default styles for mobile and '@media (min-width: ...)' to scale up to larger screens.\n`,
      );
      violationsCount++;
    }
  });
}

if (violationsCount > 0) {
  console.error(`\x1b[31mTotal violations found: ${violationsCount}\x1b[0m`);
  console.error(
    'Please refactor these styles to be mobile-first. Desktop-first max-width breakpoints are not permitted.',
  );
  process.exit(1);
} else {
  console.log('\x1b[32mAll styles are compliant with mobile-first design principles.\x1b[0m');
  process.exit(0);
}
