import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const indexSource = readFileSync(resolve(process.cwd(), 'src/index.html'), 'utf8');
const vercelSource = readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8');

describe('auth-status document isolation', () => {
  it('does not load third-party analytics inside the cross-site bridge', () => {
    expect(indexSource).toContain("window.location.pathname.startsWith('/auth-status')");
    expect(indexSource).not.toContain(
      '<script async src="https://www.googletagmanager.com/gtag/js',
    );
  });

  it('keeps auth-status CSP on Vercel CSR deploy', () => {
    expect(vercelSource).toContain('"source": "/auth-status"');
    expect(vercelSource).toContain('no-store, no-transform');
    expect(vercelSource).toContain('Content-Security-Policy');
  });
});
