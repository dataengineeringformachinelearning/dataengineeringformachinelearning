#!/usr/bin/env node
/** Replaces static mat-icon elements with flux-app-icon in frontend templates. */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('src');

const walk = (dir, files = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (entry.name.endsWith('.html')) {
      files.push(full);
    }
  }
  return files;
};

const convertStaticIcons = html =>
  html.replace(/<mat-icon([^>]*)>([^<{]+)<\/mat-icon>/g, (_match, attrs, iconName) => {
    const name = iconName.trim();
    const ariaHidden = /aria-hidden\s*=\s*["']true["']/.test(attrs) ? ' [ariaHidden]="true"' : '';
    const classMatch = attrs.match(/class\s*=\s*["']([^"']+)["']/);
    const hostClass = classMatch ? ` hostClass="${classMatch[1]}"` : '';
    return `<flux-app-icon name="${name}"${ariaHidden}${hostClass} />`;
  });

const files = walk(ROOT);
let changed = 0;

for (const file of files) {
  const before = fs.readFileSync(file, 'utf8');
  const after = convertStaticIcons(before);
  if (after !== before) {
    fs.writeFileSync(file, after);
    changed += 1;
    console.log('updated', path.relative(ROOT, file));
  }
}

console.log(`Done. Updated ${changed} files.`);
