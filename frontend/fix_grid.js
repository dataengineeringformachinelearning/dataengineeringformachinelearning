const fs = require('fs');
const path = require('path');

const srcDir =
  '/Users/joealongi/Documents/github.nosync/dataengineeringformachinelearning/frontend/src';

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // We will selectively target properties that dictate spacing
  // margin, padding, gap, top, bottom, left, right
  const properties = [
    'margin',
    'margin-top',
    'margin-bottom',
    'margin-left',
    'margin-right',
    'padding',
    'padding-top',
    'padding-bottom',
    'padding-left',
    'padding-right',
    'gap',
    'top',
    'bottom',
    'left',
    'right',
  ];

  // This is a naive but effective replacer
  const lines = content.split('\n');
  const modifiedLines = lines.map(line => {
    // Only process lines that might have a spacing property
    const propMatch = line.match(/^(\s*)([a-z-]+)\s*:\s*(.+?);/);
    if (!propMatch) return line;

    const [, indent, prop, value] = propMatch;
    if (!properties.includes(prop)) return line;

    // A helper to map a px or rem value to the nearest 9px multiple
    const mapTo9px = valStr => {
      let pxVal = 0;
      if (valStr.endsWith('px')) {
        pxVal = parseFloat(valStr);
      } else if (valStr.endsWith('rem')) {
        pxVal = parseFloat(valStr) * 16;
      } else {
        return valStr;
      }

      // If it's very small like 1px or 2px, keep it
      if (pxVal <= 2) return valStr;

      // Round to nearest 9
      const mapped = Math.round(pxVal / 9) * 9;
      // fallback to 9 if 0 but was originally > 2
      const finalVal = mapped === 0 ? 9 : mapped;
      return `${finalVal}px`;
    };

    // split value by space and process each part
    const newVals = value.split(' ').map(v => {
      // Don't modify !important here, separate it first
      const hasImportant = v.includes('!important');
      let cleanV = v.replace('!important', '').trim();
      let res = mapTo9px(cleanV);
      if (hasImportant) res += ' !important';
      return res;
    });

    return `${indent}${prop}: ${newVals.join(' ')};`;
  });

  const newContent = modifiedLines.join('\n');
  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const safeFile = path.basename(file);
    const fullPath = path.join(dir, safeFile); // nosemgrep
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.scss') || fullPath.endsWith('.css')) {
      processFile(fullPath);
    }
  }
}

walkDir(srcDir);
console.log('Done.');
