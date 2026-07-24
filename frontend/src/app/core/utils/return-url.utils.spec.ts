import { describe, expect, it } from 'vitest';
import { DEFAULT_POST_LOGIN_PATH, resolvePostLoginTarget } from './return-url.utils';

describe('resolvePostLoginTarget', () => {
  const options = {
    marketingOrigin: 'https://dataengineeringformachinelearning.com',
    appOrigin: 'https://deml.app',
  };

  it('defaults to the dashboard when returnUrl is missing', () => {
    expect(resolvePostLoginTarget(undefined, options)).toEqual({
      kind: 'app',
      url: DEFAULT_POST_LOGIN_PATH,
    });
    expect(resolvePostLoginTarget('', options)).toEqual({
      kind: 'app',
      url: DEFAULT_POST_LOGIN_PATH,
    });
  });

  it('keeps safe in-app relative paths', () => {
    expect(resolvePostLoginTarget('/dashboard', options)).toEqual({
      kind: 'app',
      url: '/dashboard',
    });
    expect(resolvePostLoginTarget('/settings?tab=billing', options)).toEqual({
      kind: 'app',
      url: '/settings?tab=billing',
    });
  });

  it('rejects absolute URLs passed through navigateByUrl (the /https: bug)', () => {
    expect(resolvePostLoginTarget('https://deml.app/dashboard', options)).toEqual({
      kind: 'app',
      url: '/dashboard',
    });
    expect(resolvePostLoginTarget('https://deml.app/', options)).toEqual({
      kind: 'app',
      url: DEFAULT_POST_LOGIN_PATH,
    });
    expect(resolvePostLoginTarget('/https:', options)).toEqual({
      kind: 'app',
      url: DEFAULT_POST_LOGIN_PATH,
    });
    expect(resolvePostLoginTarget('https:', options)).toEqual({
      kind: 'app',
      url: DEFAULT_POST_LOGIN_PATH,
    });
  });

  it('allows marketing-site returns as external navigation', () => {
    expect(
      resolvePostLoginTarget(
        'https://dataengineeringformachinelearning.com/documentation/',
        options,
      ),
    ).toEqual({
      kind: 'external',
      url: 'https://dataengineeringformachinelearning.com/documentation/',
    });
  });

  it('sends auth loops and unknown hosts to the dashboard', () => {
    expect(resolvePostLoginTarget('/login', options)).toEqual({
      kind: 'app',
      url: DEFAULT_POST_LOGIN_PATH,
    });
    expect(resolvePostLoginTarget('https://deml.app/login?mode=register', options)).toEqual({
      kind: 'app',
      url: DEFAULT_POST_LOGIN_PATH,
    });
    expect(resolvePostLoginTarget('https://evil.example/phish', options)).toEqual({
      kind: 'app',
      url: DEFAULT_POST_LOGIN_PATH,
    });
  });
});
