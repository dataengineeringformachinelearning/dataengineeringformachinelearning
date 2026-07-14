import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const indexSource = readFileSync(resolve(process.cwd(), 'src/index.html'), 'utf8');
const serverSource = readFileSync(resolve(process.cwd(), 'src/server.ts'), 'utf8');

describe('auth-status document isolation', () => {
  it('does not load third-party analytics inside the cross-site bridge', () => {
    expect(indexSource).toContain("window.location.pathname.startsWith('/auth-status')");
    expect(indexSource).not.toContain(
      '<script async src="https://www.googletagmanager.com/gtag/js',
    );
  });

  it('prevents edge analytics injection without weakening the bridge CSP', () => {
    expect(serverSource).toContain("'Cache-Control', 'no-store, no-transform'");
    expect(serverSource).toContain("headers.set('Content-Security-Policy', AUTH_STATUS_CSP)");
  });
});
