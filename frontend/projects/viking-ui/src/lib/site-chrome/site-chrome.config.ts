import { VikingIconName } from '../core/icons';

export type SiteChromeContext = 'app' | 'marketing' | 'backend';

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
}

export interface SiteFooterLink {
  label: string;
  appHref: string;
  marketingHref: string;
  external?: boolean;
  action?: 'cookie-settings' | 'bug-report';
}

export interface SiteFooterColumn {
  title: string;
  links: SiteFooterLink[];
}

/** Primary navbar links (desktop + mobile). Auth-only links filtered at render time. */
export const SITE_NAV_LINKS: readonly SiteNavLink[] = [
  {
    id: 'explore',
    label: 'Explore',
    icon: 'globe',
    appHref: '/explore',
    marketingHref: '/explore',
  },
  {
    id: 'documentation',
    label: 'Documentation',
    icon: 'file',
    appHref: 'https://dataengineeringformachinelearning.com/documentation/',
    marketingHref: '/documentation',
    external: true,
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'home',
    appHref: '/dashboard',
    marketingHref: '/dashboard',
    requireAuth: true,
  },
  {
    id: 'setup',
    label: 'Setup',
    icon: 'globe',
    appHref: '/settings',
    marketingHref: '/settings',
    requireAuth: true,
  },
  {
    id: 'account',
    label: 'Account',
    icon: 'user',
    appHref: '/account',
    marketingHref: '/account',
    requireAuth: true,
  },
] as const;

export const SITE_FOOTER_COLUMNS: readonly SiteFooterColumn[] = [
  {
    title: 'Platform',
    links: [
      { label: 'Explore', appHref: '/explore', marketingHref: '/explore' },
      { label: 'Dashboard', appHref: '/dashboard', marketingHref: '/dashboard' },
      { label: 'Setup', appHref: '/settings', marketingHref: '/settings' },
      { label: 'Account', appHref: '/account', marketingHref: '/account' },
      {
        label: 'Platform Status',
        appHref: '/status/platform-status',
        marketingHref: '/status/platform-status',
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
        external: true,
      },
      {
        label: 'Whitepaper',
        appHref: 'https://dataengineeringformachinelearning.com/whitepaper/',
        marketingHref: '/whitepaper',
        external: true,
      },
      {
        label: 'Book',
        appHref: 'https://dataengineeringformachinelearning.com/book/',
        marketingHref: '/book',
        external: true,
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
      },
      {
        label: 'Report a Bug',
        appHref: '#',
        marketingHref: 'mailto:support@dataengineeringformachinelearning.com',
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
        external: true,
      },
      {
        label: 'Terms of Service',
        appHref: 'https://dataengineeringformachinelearning.com/terms/',
        marketingHref: '/terms',
        external: true,
      },
      {
        label: 'SOC2 Compliance',
        appHref: 'https://dataengineeringformachinelearning.com/compliance/',
        marketingHref: '/compliance',
        external: true,
      },
      {
        label: 'GDPR Compliance',
        appHref: 'https://dataengineeringformachinelearning.com/privacy/#gdpr',
        marketingHref: '/privacy#gdpr',
        external: true,
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

const isAbsoluteUrl = (href: string): boolean => /^https?:\/\//i.test(href);

const joinBase = (base: string, path: string): string => {
  if (isAbsoluteUrl(path)) {
    return path;
  }
  const normalizedBase = base.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
};

export const resolveNavHref = (
  link: SiteNavLink,
  context: SiteChromeContext,
  urls: SiteUrls,
): string => {
  if (context === 'app') {
    return link.appHref;
  }
  if (context === 'marketing') {
    if (isAbsoluteUrl(link.marketingHref)) {
      return link.marketingHref;
    }
    return link.marketingHref.startsWith('/')
      ? link.marketingHref
      : joinBase(urls.marketing, link.marketingHref);
  }
  return isAbsoluteUrl(link.appHref) ? link.appHref : joinBase(urls.app, link.appHref);
};

export const resolveFooterHref = (
  link: SiteFooterLink,
  context: SiteChromeContext,
  urls: SiteUrls,
): string => {
  if (link.action) {
    return '#';
  }
  if (context === 'app') {
    return link.appHref;
  }
  if (context === 'marketing') {
    if (isAbsoluteUrl(link.marketingHref)) {
      return link.marketingHref;
    }
    if (link.marketingHref.startsWith('mailto:')) {
      return link.marketingHref;
    }
    return link.marketingHref.startsWith('/')
      ? link.marketingHref
      : joinBase(urls.marketing, link.marketingHref);
  }
  return isAbsoluteUrl(link.appHref) ? link.appHref : joinBase(urls.app, link.appHref);
};

export const resolveBrandHref = (context: SiteChromeContext, urls: SiteUrls): string => {
  if (context === 'marketing') {
    return '/';
  }
  if (context === 'app') {
    return urls.marketing;
  }
  return urls.marketing;
};

export const visibleNavLinks = (
  links: readonly SiteNavLink[],
  isAuthenticated: boolean,
): SiteNavLink[] => links.filter(link => !link.requireAuth || isAuthenticated);

export const DEFAULT_SITE_URLS: SiteUrls = {
  app: 'https://deml.app',
  marketing: 'https://dataengineeringformachinelearning.com',
  backend: 'https://backend.deml.app',
};
