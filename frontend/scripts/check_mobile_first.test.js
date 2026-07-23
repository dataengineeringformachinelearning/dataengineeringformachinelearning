const assert = require('node:assert/strict');
const test = require('node:test');

const { findViolations, shouldScanFile, toPixels } = require('./check_mobile_first');

test('accepts canonical media and container breakpoints', () => {
  const source = `
    @media (min-width: 640px) {}
    @media (min-width: 48rem) {}
    @container card (min-width: 64em) {}
    @container page (min-width: 1280px) {}
    window.matchMedia("(min-width: 1024px)");
  `;

  assert.deepEqual(findViolations(source), []);
});

test('rejects desktop-first and noncanonical responsive queries', () => {
  const source = `
    @media (max-width: 767px) {}
    @media (min-width: 600px) {}
    @container nav (min-width: 880px) and (max-width: 1120px) {}
  `;

  assert.deepEqual(
    findViolations(source).map(({ line, reason }) => ({ line, reason })),
    [
      { line: 2, reason: 'media max-width queries are not mobile-first' },
      { line: 3, reason: '600px is not an allowed breakpoint' },
      { line: 4, reason: '880px is not an allowed breakpoint' },
      { line: 4, reason: 'container max-width queries are not mobile-first' },
    ],
  );
});

test('ignores properties, dynamic Sass mixins, and accessibility queries', () => {
  const source = `
    .content { max-width: 42rem; }
    @media (min-width: $value) {}
    @media (prefers-reduced-motion: reduce) {}
    @media (forced-colors: active) {}
  `;

  assert.deepEqual(findViolations(source), []);
});

test('rejects invalid concrete units, range syntax, and runtime media queries', () => {
  const source = `
    @media (min-width: 600vw) {}
    @container card (min-width: calc(640px)) {}
    @media (width >= 640px) {}
    window.matchMedia("(min-width: 901px)");
    matchMedia("(max-width: 1280px)");
    matchMedia("(640px <= width)");
  `;

  assert.deepEqual(
    findViolations(source).map(({ line, reason }) => ({ line, reason })),
    [
      {
        line: 2,
        reason: '600vw is not a concrete canonical breakpoint',
      },
      {
        line: 3,
        reason: 'calc(640px) is not a concrete canonical breakpoint',
      },
      {
        line: 4,
        reason: 'media range width queries must use min-width',
      },
      {
        line: 5,
        reason: '901px is not an allowed breakpoint',
      },
      {
        line: 6,
        reason: 'matchMedia max-width queries are not mobile-first',
      },
      {
        line: 7,
        reason: 'matchMedia range width queries must use min-width',
      },
    ],
  );
});

test('ignores responsive examples inside source and inline CSS comments', () => {
  const source = [
    '// @media (max-width: 767px) {}',
    '/* @container card (min-width: 600px) {} */',
    'const styles = `',
    '  /* @media (max-width: 520px) {} */',
    '  @media (min-width: 640px) {}',
    '`;',
    '// window.matchMedia("(min-width: 901px)");',
  ].join('\n');

  assert.deepEqual(findViolations(source), []);
});

test('scans authored and copied JavaScript but skips generated bundles', () => {
  assert.equal(shouldScanFile('frontend/src/assets/widget.js'), true);
  assert.equal(shouldScanFile('backend/static/widgets/widget.js'), true);
  assert.equal(shouldScanFile('frontend/scripts/check.mjs'), true);
  assert.equal(shouldScanFile('backend/static/viking-ui-elements.js'), false);
  assert.equal(shouldScanFile('frontend/public/assets/viking-ui.css'), false);
});

test('normalizes px, rem, and em values', () => {
  assert.equal(toPixels('640px'), 640);
  assert.equal(toPixels('48rem'), 768);
  assert.equal(toPixels('64em'), 1024);
  assert.equal(toPixels('$value'), null);
});
