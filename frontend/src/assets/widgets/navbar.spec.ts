import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const navbarSource = readFileSync(resolve(process.cwd(), 'src/assets/widgets/navbar.js'), 'utf8');
const frontendOrigin = 'https://deml.app';

type DemlWindow = Window &
  typeof globalThis & {
    __DEML?: Record<string, string>;
    __DEML_AUTH_BRIDGE_READY__?: boolean;
    DemlWidgets?: Record<string, unknown>;
  };

const flushInit = async (): Promise<void> => {
  document.dispatchEvent(new Event('DOMContentLoaded'));
  await Promise.resolve();
  await Promise.resolve();
};

describe('shared navbar authentication bridge', () => {
  const demLWindow = window as DemlWindow;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-authenticated');
    document.body.innerHTML = `
      <a id="auth-btn-desktop"><span id="auth-icon-desktop"></span><span id="auth-text-desktop">Sign In</span></a>
      <a id="auth-btn-mobile"><span id="auth-icon-mobile"></span><span id="auth-text-mobile">Sign In</span></a>
      <button id="auth-signout-desktop" hidden>Sign Out</button>
      <button id="auth-signout-mobile" hidden>Sign Out</button>
      <a id="protected-link" data-require-auth="true" hidden href="https://deml.app/dashboard">Dashboard</a>
      <a id="aware-cta" href="https://deml.app/login" data-authenticated-href="https://deml.app/dashboard" data-authenticated-label="Open Dashboard" data-auth-label>Get Started</a>
    `;
    delete demLWindow.__DEML_AUTH_BRIDGE_READY__;
    demLWindow.DemlWidgets = {};
    demLWindow.__DEML = {
      FRONTEND_URL: frontendOrigin,
      BACKEND_URL: 'https://backend.deml.app',
      MARKETING_URL: 'https://dataengineeringformachinelearning.com',
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 404 })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    delete demLWindow.__DEML_AUTH_BRIDGE_READY__;
    delete demLWindow.__DEML;
    demLWindow.DemlWidgets = {};
  });

  it('keeps a trusted iframe alive and updates protected controls in both directions', async () => {
    window.eval(navbarSource);
    await flushInit();

    const iframe = document.getElementById('deml-auth-status-bridge') as HTMLIFrameElement;
    expect(iframe).toBeTruthy();
    expect(iframe.hidden).toBe(true);

    window.dispatchEvent(
      new MessageEvent('message', {
        origin: frontendOrigin,
        source: iframe.contentWindow,
        data: { type: 'AUTH_STATUS', isAuthenticated: true, role: 'Operator' },
      }),
    );

    expect(document.documentElement.dataset['authenticated']).toBe('true');
    expect(document.getElementById('protected-link')?.hidden).toBe(false);
    expect(document.getElementById('aware-cta')?.getAttribute('href')).toBe(
      'https://deml.app/dashboard',
    );
    expect(document.getElementById('aware-cta')?.textContent).toBe('Open Dashboard');

    window.dispatchEvent(
      new MessageEvent('message', {
        origin: frontendOrigin,
        source: iframe.contentWindow,
        data: { type: 'AUTH_STATUS', isAuthenticated: false },
      }),
    );

    expect(document.documentElement.dataset['authenticated']).toBe('false');
    expect(document.getElementById('protected-link')?.hidden).toBe(true);
    expect(document.getElementById('aware-cta')?.getAttribute('href')).toBe(
      'https://deml.app/login',
    );
    expect(document.getElementById('aware-cta')?.textContent).toBe('Get Started');
    expect(document.getElementById('deml-auth-status-bridge')).toBe(iframe);
  });

  it('rejects auth messages from an untrusted origin or window', async () => {
    window.eval(navbarSource);
    await flushInit();

    const iframe = document.getElementById('deml-auth-status-bridge') as HTMLIFrameElement;
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://deml.app.evil.example',
        source: iframe.contentWindow,
        data: { type: 'AUTH_STATUS', isAuthenticated: true },
      }),
    );

    expect(document.documentElement.dataset['authenticated']).toBe('false');
    expect(document.getElementById('protected-link')?.hidden).toBe(true);
  });
});
