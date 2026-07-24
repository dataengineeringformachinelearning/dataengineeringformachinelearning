const fs = require('fs');
const path = require('path');

const SCAN_DIRS = [
  path.resolve(__dirname, '../src'),
  path.resolve(__dirname, '../../packages/viking-ui/src'),
  path.resolve(__dirname, '../../marketing/src/components'),
  path.resolve(__dirname, '../../marketing/src/pages'),
  path.resolve(__dirname, '../../marketing/src/layouts'),
  path.resolve(__dirname, '../../backend/static'),
  path.resolve(__dirname, '../../viking-ui-docs/src'),
];

// Generated bundles may minify entire files onto one line; property names like
// max-width must not be mistaken for @media (max-width: …) breakpoints.
const GENERATED_ASSET =
  /(?:^|\/)(?:(?:viking-ui|deml-components|design-tokens|viking-components)\.css|viking-ui-elements\.js)$/;
const SOURCE_FILE = /\.(?:css|scss|[cm]?[jt]sx?)$/i;
const RESPONSIVE_QUERY = /@(media|container)\b[^{]*/gi;
const WIDTH_CLAUSE = /\(\s*(min|max)-width\s*:\s*((?:[^()]|\([^()]*\))+)\)/gi;
const RANGE_WIDTH_CLAUSE = /\([^)]*(?:\bwidth\s*(?:<=|>=|<|>)|(?:<=|>=|<|>)\s*width\b)[^)]*\)/gi;
const MATCH_MEDIA_CALL = /\bmatchMedia\s*\(\s*(["'`])([\s\S]*?)\1\s*\)/gi;
const ALLOWED_BREAKPOINTS = new Set([640, 768, 1024, 1280]);
const DYNAMIC_SASS_BREAKPOINT = /^(?:\$[\w-]+|#\{\$[\w-]+\})$/;

function shouldScanFile(filePath) {
  return SOURCE_FILE.test(filePath) && !GENERATED_ASSET.test(filePath);
}

function getFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
    const filePath = path.join(dir, path.basename(file));
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getFiles(filePath, fileList);
    } else if (shouldScanFile(filePath)) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

function maskComments(content) {
  const result = content.split('');
  let state = 'code';
  let returnState = 'code';

  const mask = index => {
    if (result[index] !== '\n' && result[index] !== '\r') {
      result[index] = ' ';
    }
  };

  for (let index = 0; index < content.length; index++) {
    const char = content[index];
    const next = content[index + 1];

    if (state === 'line-comment') {
      if (char === '\n' || char === '\r') {
        state = 'code';
      } else {
        mask(index);
      }
      continue;
    }

    if (state === 'block-comment') {
      mask(index);
      if (char === '*' && next === '/') {
        mask(index + 1);
        index++;
        state = returnState;
      }
      continue;
    }

    if (state === 'single-quote' || state === 'double-quote') {
      if (char === '\\') {
        index++;
      } else if (
        (state === 'single-quote' && char === "'") ||
        (state === 'double-quote' && char === '"')
      ) {
        state = 'code';
      }
      continue;
    }

    if (state === 'template') {
      if (char === '\\') {
        index++;
      } else if (char === '`') {
        state = 'code';
      } else if (char === '/' && next === '*') {
        mask(index);
        mask(index + 1);
        index++;
        returnState = 'template';
        state = 'block-comment';
      }
      continue;
    }

    if (char === '/' && next === '/') {
      mask(index);
      mask(index + 1);
      index++;
      state = 'line-comment';
    } else if (char === '/' && next === '*') {
      mask(index);
      mask(index + 1);
      index++;
      returnState = 'code';
      state = 'block-comment';
    } else if (char === "'") {
      state = 'single-quote';
    } else if (char === '"') {
      state = 'double-quote';
    } else if (char === '`') {
      state = 'template';
    }
  }

  return result.join('');
}

function toPixels(value) {
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*(px|r?em)$/i);
  if (!match) {
    return null;
  }
  const amount = Number(match[1]);
  return match[2].toLowerCase() === 'px' ? amount : amount * 16;
}

function inspectQuery(content, queryText, kind, queryIndex, displayQuery) {
  const violations = [];
  for (const range of queryText.matchAll(RANGE_WIDTH_CLAUSE)) {
    const index = queryIndex + (range.index ?? 0);
    violations.push({
      line: content.slice(0, index).split('\n').length,
      query: displayQuery,
      reason: `${kind} range width queries must use min-width`,
    });
  }

  for (const clause of queryText.matchAll(WIDTH_CLAUSE)) {
    const [, direction, value] = clause;
    const index = queryIndex + (clause.index ?? 0);
    const line = content.slice(0, index).split('\n').length;

    if (direction.toLowerCase() === 'max') {
      violations.push({
        line,
        query: displayQuery,
        reason: `${kind} max-width queries are not mobile-first`,
      });
      continue;
    }

    const pixels = toPixels(value);
    const breakpoint = value.trim();
    if (pixels === null && !DYNAMIC_SASS_BREAKPOINT.test(breakpoint)) {
      violations.push({
        line,
        query: displayQuery,
        reason: `${breakpoint} is not a concrete canonical breakpoint`,
      });
    } else if (pixels !== null && !ALLOWED_BREAKPOINTS.has(pixels)) {
      violations.push({
        line,
        query: displayQuery,
        reason: `${breakpoint} is not an allowed breakpoint`,
      });
    }
  }
  return violations;
}

function findViolations(content) {
  const violations = [];
  const source = maskComments(content);

  for (const query of source.matchAll(RESPONSIVE_QUERY)) {
    const queryText = query[0];
    violations.push(
      ...inspectQuery(
        content,
        queryText,
        query[1].toLowerCase(),
        query.index ?? 0,
        queryText.trim(),
      ),
    );
  }

  for (const call of source.matchAll(MATCH_MEDIA_CALL)) {
    const queryText = call[2];
    const queryOffset = call[0].indexOf(queryText);
    violations.push(
      ...inspectQuery(
        content,
        queryText,
        'matchMedia',
        (call.index ?? 0) + queryOffset,
        call[0].trim(),
      ),
    );
  }
  return violations;
}

function run(scanDirs = SCAN_DIRS) {
  const files = scanDirs.flatMap(dir => (fs.existsSync(dir) ? getFiles(dir) : []));
  let violationsCount = 0;

  console.log(
    `Scanning ${files.length} CSS, SCSS, JavaScript, and TypeScript source files for mobile-first responsive queries...`,
  );

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const relativePath = path.relative(path.resolve(__dirname, '..'), file);
    for (const violation of findViolations(content)) {
      console.error(`\x1b[31mViolation found in ${relativePath}:${violation.line}\x1b[0m`);
      console.error(`  Query: ${violation.query}`);
      console.error(`  Reason: ${violation.reason}\n`);
      violationsCount++;
    }
  }

  if (violationsCount > 0) {
    console.error(`\x1b[31mTotal violations found: ${violationsCount}\x1b[0m`);
    console.error(
      'Use mobile base styles and min-width breakpoints at 640px, 768px, 1024px, or 1280px.',
    );
    return 1;
  }

  console.log('\x1b[32mAll responsive queries are mobile-first and canonical.\x1b[0m');
  return 0;
}

if (require.main === module) {
  process.exitCode = run();
}

module.exports = {
  ALLOWED_BREAKPOINTS,
  findViolations,
  maskComments,
  run,
  shouldScanFile,
  toPixels,
};
