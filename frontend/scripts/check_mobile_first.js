const fs = require('fs');
const path = require('path');

const SCAN_DIRS = [
  path.resolve(__dirname, '../src'),
  path.resolve(__dirname, '../../marketing/src/styles'),
  path.resolve(__dirname, '../../marketing/src/components'),
  path.resolve(__dirname, '../../marketing/src/pages'),
  path.resolve(__dirname, '../../marketing/src/layouts'),
];
const ALLOWED_EXCEPTIONS = ['/* mobile-first-exception */', '/* mobile-first-override */'];

function getFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
    const filePath = path.join(dir, path.basename(file));
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getFiles(filePath, fileList);
    } else if (file.endsWith('.css') || file.endsWith('.scss')) {
      fileList.push(filePath);
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
    // Check if line contains a media query with max-width
    if (line.includes('@media') && line.includes('max-width')) {
      // Check if this line has an exception comment
      const hasException = ALLOWED_EXCEPTIONS.some(exc => line.includes(exc));
      if (!hasException) {
        const relativePath = path.relative(path.resolve(__dirname, '..'), file);
        console.error(`\x1b[31mViolation found in ${relativePath}:${index + 1}\x1b[0m`);
        console.error(`  Line: ${line.trim()}`);
        console.error(
          `  Hint: Avoid desktop-first 'max-width' media queries. Design mobile-first using default styles for mobile and '@media (min-width: ...)' to scale up to larger screens.\n`,
        );
        violationsCount++;
      }
    }
  });
}

if (violationsCount > 0) {
  console.error(`\x1b[31mTotal violations found: ${violationsCount}\x1b[0m`);
  console.error(
    "Please refactor these styles to be mobile-first or add '/* mobile-first-exception */' to the line if it is a necessary override.",
  );
  process.exit(1);
} else {
  console.log('\x1b[32mAll styles are compliant with mobile-first design principles.\x1b[0m');
  process.exit(0);
}
