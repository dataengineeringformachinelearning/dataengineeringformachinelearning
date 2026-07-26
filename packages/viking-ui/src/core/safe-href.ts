/**
 * Client navigation hygiene — block XSS URL schemes and open redirects.
 * Dual-adapter: keep API aligned with forjd-ui core/a11y/safe-href
 * (FORJD ADR-0013 / ADR-0016).
 */

export type SafeHrefOptions = {
  /**
   * When set, absolute `http(s)` URLs must match one of these hosts
   * (exact or subdomain). Relative `/…` and `#…` ignore this list.
   */
  readonly allowedHosts?: readonly string[];
  /**
   * When true, reject `http:` except loopback (`localhost`, `127.0.0.1`, `::1`).
   */
  readonly httpsOnlyExceptLoopback?: boolean;
};

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;
const DANGEROUS_SCHEME = /^(javascript|data|vbscript|blob|file):/i;
const HAS_SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function hostAllowed(
  hostname: string,
  allowedHosts: readonly string[],
): boolean {
  const host = hostname.toLowerCase();
  return allowedHosts.some((entry) => {
    const allowed = entry.toLowerCase();
    return host === allowed || host.endsWith(`.${allowed}`);
  });
}

/**
 * Return a safe href for `<a>` / button-as-link, or `null` when unsafe.
 */
export function safeHref(
  raw: string | null | undefined,
  options: SafeHrefOptions = {},
): string | null {
  if (raw == null) {
    return null;
  }
  const href = raw.trim();
  if (!href || CONTROL_CHARS.test(href)) {
    return null;
  }

  if (href.startsWith("#") && !href.includes(":")) {
    return href;
  }

  if (href.startsWith("/") && !href.startsWith("//")) {
    return href;
  }

  if (href.startsWith("//") || DANGEROUS_SCHEME.test(href)) {
    return null;
  }

  if (!HAS_SCHEME.test(href)) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }

  const protocol = url.protocol.toLowerCase();
  if (protocol === "mailto:" || protocol === "tel:") {
    return href;
  }
  if (protocol !== "http:" && protocol !== "https:") {
    return null;
  }

  if (
    protocol === "http:" &&
    options.httpsOnlyExceptLoopback &&
    !LOOPBACK_HOSTS.has(url.hostname.toLowerCase())
  ) {
    return null;
  }

  if (
    options.allowedHosts?.length &&
    !hostAllowed(url.hostname, options.allowedHosts)
  ) {
    return null;
  }

  return url.href;
}

/** Normalize an API/origin base to a safe `http(s)` origin+path (no trailing slash). */
export function safeHttpBase(
  raw: string | null | undefined,
  options: SafeHrefOptions = {},
): string | null {
  const href = safeHref(
    typeof raw === "string" ? raw.replace(/\/+$/, "") : raw,
    options,
  );
  if (!href) {
    return null;
  }
  try {
    const url = new URL(href);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    const path = url.pathname.replace(/\/+$/, "");
    return `${url.origin}${path === "/" ? "" : path}`;
  } catch {
    return null;
  }
}
