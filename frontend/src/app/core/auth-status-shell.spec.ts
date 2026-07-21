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

  it('ships site-wide CSP and browser hardening headers on Vercel', () => {
    expect(vercelSource).toContain("base-uri 'self'");
    expect(vercelSource).toContain("object-src 'none'");
    expect(vercelSource).toContain('X-Content-Type-Options');
    expect(vercelSource).toContain('X-Frame-Options');
    expect(vercelSource).toContain('Strict-Transport-Security');
    // Catch-all SPA source after the auth-status-specific rule.
    expect(vercelSource).toMatch(/"source": "\/\(\.\*\)"/);
  });
});
