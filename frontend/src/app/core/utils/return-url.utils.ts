/** Default post-login destination inside the Angular app. */
export const DEFAULT_POST_LOGIN_PATH = '/dashboard';

export type PostLoginTarget = { kind: 'app'; url: string } | { kind: 'external'; url: string };

type ResolveOptions = {
  marketingOrigin?: string;
  appOrigin?: string;
  fallback?: string;
};

const AUTH_PATHS = new Set(['/login', '/register', '/auth-status']);

const isAuthPath = (pathname: string): boolean => {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  return AUTH_PATHS.has(normalized) || normalized.startsWith('/auth-status/');
};

const isSafeAppPath = (path: string): boolean => {
  if (!path.startsWith('/') || path.startsWith('//')) {
    return false;
  }
  // Angular treats absolute URLs as path segments (e.g. "https:" → /https:).
  if (/^\/https?:/i.test(path)) {
    return false;
  }
  try {
    const parsed = new URL(path, 'https://deml.invalid');
    return !isAuthPath(parsed.pathname);
  } catch {
    return false;
  }
};

/**
 * Resolve a login `returnUrl` into an in-app router path or an allowed external URL.
 * Absolute same-origin URLs are reduced to pathname+search+hash so Angular never
 * receives a protocol string via `navigateByUrl`.
 */
export const resolvePostLoginTarget = (
  returnUrl: string | null | undefined,
  options: ResolveOptions = {},
): PostLoginTarget => {
  const fallback = options.fallback ?? DEFAULT_POST_LOGIN_PATH;
  const raw = typeof returnUrl === 'string' ? returnUrl.trim() : '';
  if (!raw) {
    return { kind: 'app', url: fallback };
  }

  if (isSafeAppPath(raw)) {
    return { kind: 'app', url: raw };
  }

  try {
    const absolute = new URL(raw);
    if (absolute.protocol !== 'http:' && absolute.protocol !== 'https:') {
      return { kind: 'app', url: fallback };
    }

    const marketingOrigin = options.marketingOrigin ?? '';
    if (marketingOrigin && absolute.origin === marketingOrigin) {
      return { kind: 'external', url: absolute.href };
    }

    const appOrigin = options.appOrigin ?? '';
    if (appOrigin && absolute.origin === appOrigin) {
      const path = `${absolute.pathname}${absolute.search}${absolute.hash}`;
      // Bare app origin should land on the dashboard after sign-in.
      if (absolute.pathname === '/' && !absolute.search && !absolute.hash) {
        return { kind: 'app', url: fallback };
      }
      if (isSafeAppPath(path)) {
        return { kind: 'app', url: path };
      }
      return { kind: 'app', url: fallback };
    }
  } catch {
    // Non-URL values fall through to the dashboard default.
  }

  return { kind: 'app', url: fallback };
};
