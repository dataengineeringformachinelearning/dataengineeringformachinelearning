import { VikingIconName } from '../core/icons';

/**
 * Drakkar — the Viking longship that carries the site shell (navbar, footer, nav links)
 * across marketing, app, and backend surfaces.
 */

/** Which DEML surface the Drakkar shell is rendering on (navbar + footer). */
export type SiteDrakkarContext = 'app' | 'marketing' | 'backend';

export interface SiteUrls {
  app: string;
  marketing: string;
  backend: string;
}

export interface SiteNavLink {
  id: string;
  label: string;
  icon: VikingIconName;
  appHref: string;
  marketingHref: string;
  external?: boolean;
  requireAuth?: boolean;
  /** Routes served by deml.app — resolved to absolute app URLs off-app. */
  platform?: boolean;
}

export interface SiteFooterLink {
  label: string;
  appHref: string;
  marketingHref: string;
  external?: boolean;
  action?: 'cookie-settings' | 'bug-report';
  /** Routes served by deml.app — resolved to absolute app URLs off-app. */
  platform?: boolean;
}

export interface SiteFooterColumn {
  title: string;
  links: SiteFooterLink[];
}

/** Primary navbar links (desktop + mobile). Shown on every surface. */
export const SITE_NAV_LINKS: readonly SiteNavLink[] = [
  {
    id: 'explore',
    label: 'Explore',
    icon: 'globe',
    appHref: '/explore',
    marketingHref: '/explore',
    platform: true,
  },
  {
    id: 'documentation',
    label: 'Documentation',
    icon: 'file',
    appHref: 'https://dataengineeringformachinelearning.com/documentation/',
    marketingHref: '/documentation',
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'home',
    appHref: '/dashboard',
    marketingHref: '/dashboard',
    requireAuth: true,
    platform: true,
  },
  {
    id: 'sites',
    label: 'Sites',
    icon: 'building',
    appHref: '/settings',
    marketingHref: '/settings',
    requireAuth: true,
    platform: true,
  },
  {
    id: 'account',
    label: 'Account',
    icon: 'user',
    appHref: '/account',
    marketingHref: '/account',
    requireAuth: true,
    platform: true,
  },
] as const;

export const SITE_FOOTER_COLUMNS: readonly SiteFooterColumn[] = [
  {
    title: 'Platform',
    links: [
      { label: 'Explore', appHref: '/explore', marketingHref: '/explore', platform: true },
      { label: 'Dashboard', appHref: '/dashboard', marketingHref: '/dashboard', platform: true },
      { label: 'Sites', appHref: '/settings', marketingHref: '/settings', platform: true },
      { label: 'Account', appHref: '/account', marketingHref: '/account', platform: true },
      {
        label: 'Platform Status',
        appHref: '/status/platform-status',
        marketingHref: '/status/platform-status',
        platform: true,
      },
    ],
  },
  {
    title: 'Resources',
    links: [
      {
        label: 'Documentation',
        appHref: 'https://dataengineeringformachinelearning.com/documentation/',
        marketingHref: '/documentation',
      },
      {
        label: 'Whitepaper',
        appHref: 'https://dataengineeringformachinelearning.com/whitepaper/',
        marketingHref: '/whitepaper',
      },
      {
        label: 'Book',
        appHref: 'https://dataengineeringformachinelearning.com/book/',
        marketingHref: '/book',
      },
    ],
  },
  {
    title: 'Support',
    links: [
      {
        label: 'Platform Status',
        appHref: '/status/platform-status',
        marketingHref: '/status/platform-status',
        platform: true,
      },
      {
        label: 'Report a Bug',
        appHref: '#',
        marketingHref: '#',
        action: 'bug-report',
      },
    ],
  },
  {
    title: 'Legal & Compliance',
    links: [
      {
        label: 'Privacy Policy',
        appHref: 'https://dataengineeringformachinelearning.com/privacy/',
        marketingHref: '/privacy',
      },
      {
        label: 'Terms of Service',
        appHref: 'https://dataengineeringformachinelearning.com/terms/',
        marketingHref: '/terms',
      },
      {
        label: 'SOC2 Compliance',
        appHref: 'https://dataengineeringformachinelearning.com/compliance/',
        marketingHref: '/compliance',
      },
      {
        label: 'GDPR Compliance',
        appHref: 'https://dataengineeringformachinelearning.com/privacy/#gdpr',
        marketingHref: '/privacy#gdpr',
      },
      {
        label: 'Cookie Settings',
        appHref: '#',
        marketingHref: '#',
        action: 'cookie-settings',
      },
    ],
  },
] as const;

export const BUG_REPORT_QUERY = 'reportBug=1';
export const COOKIE_SETTINGS_QUERY = 'cookieSettings=1';

const isAbsoluteUrl = (href: string): boolean => /^https?:\/\//i.test(href);

const joinBase = (base: string, path: string): string => {
  if (isAbsoluteUrl(path)) {
    return path;
  }
  const normalizedBase = base.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
};

export const bugReportHref = (urls: SiteUrls): string =>
  `${joinBase(urls.app, '/')}?${BUG_REPORT_QUERY}`;

export const cookieSettingsHref = (urls: SiteUrls): string =>
  `${joinBase(urls.marketing, '/')}?${COOKIE_SETTINGS_QUERY}`;

const resolveMarketingContentHref = (href: string, urls: SiteUrls): string => {
  if (isAbsoluteUrl(href)) {
    return href;
  }
  if (href.startsWith('mailto:')) {
    return href;
  }
  return href.startsWith('/') ? href : joinBase(urls.marketing, href);
};

const resolvePlatformHref = (href: string, context: SiteDrakkarContext, urls: SiteUrls): string => {
  if (context === 'app') {
    return href;
  }
  return joinBase(urls.app, href);
};

export const resolveNavHref = (
  link: SiteNavLink,
  context: SiteDrakkarContext,
  urls: SiteUrls,
): string => {
  if (link.platform) {
    return resolvePlatformHref(link.appHref, context, urls);
  }
  if (context === 'app') {
    return link.appHref;
  }
  return resolveMarketingContentHref(link.marketingHref, urls);
};

export const resolveFooterHref = (
  link: SiteFooterLink,
  context: SiteDrakkarContext,
  urls: SiteUrls,
): string => {
  if (link.action === 'bug-report') {
    return context === 'app' ? '#' : bugReportHref(urls);
  }
  if (link.action === 'cookie-settings') {
    return cookieSettingsHref(urls);
  }
  if (link.platform) {
    return resolvePlatformHref(link.appHref, context, urls);
  }
  if (context === 'app') {
    return link.appHref;
  }
  return resolveMarketingContentHref(link.marketingHref, urls);
};

export const resolveBrandHref = (context: SiteDrakkarContext, urls: SiteUrls): string => {
  if (context === 'marketing') {
    return '/';
  }
  return urls.marketing;
};

/** Navbar links; auth-gated entries appear only when the session is active. */
export const visibleNavLinks = (
  links: readonly SiteNavLink[],
  isAuthenticated = false,
): SiteNavLink[] => links.filter(link => !link.requireAuth || isAuthenticated);

export const isAppRouterPath = (href: string): boolean =>
  !isAbsoluteUrl(href) && href.startsWith('/');

export const DEFAULT_SITE_URLS: SiteUrls = {
  app: 'https://deml.app',
  marketing: 'https://dataengineeringformachinelearning.com',
  backend: 'https://backend.deml.app',
};
