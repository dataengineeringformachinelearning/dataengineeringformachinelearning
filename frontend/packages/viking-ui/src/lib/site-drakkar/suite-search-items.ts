import type {
  SiteDrakkarContext,
  SiteFooterLink,
  SiteNavLink,
  SiteUrls,
} from './site-drakkar.config';
import {
  SITE_FOOTER_COLUMNS,
  SITE_NAV_LINKS,
  bugReportHref,
  cookieSettingsHref,
  resolveFooterHref,
  resolveNavHref,
} from './site-drakkar.config';

/** Curated command-palette entry for cross-surface navigation. */
export type SuiteSearchItem = {
  title: string;
  href: string;
  snippet?: string;
  group?: string;
  keywords?: string[];
  action?: 'cookie-settings' | 'bug-report';
};

const dedupeItems = (items: SuiteSearchItem[]): SuiteSearchItem[] => {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = `${item.title}:${item.href}:${item.action ?? ''}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const navItem = (
  link: SiteNavLink,
  context: SiteDrakkarContext,
  urls: SiteUrls,
): SuiteSearchItem => ({
  title: link.label,
  href: resolveNavHref(link, context, urls),
  snippet: `Open ${link.label}`,
  group: 'Platform',
  keywords: [link.id, link.label.toLowerCase(), 'navigate', 'go'],
});

const footerItem = (
  link: SiteFooterLink,
  columnTitle: string,
  context: SiteDrakkarContext,
  urls: SiteUrls,
): SuiteSearchItem => {
  if (link.action === 'cookie-settings') {
    return {
      title: link.label,
      href: cookieSettingsHref(urls),
      snippet: 'Manage analytics and cookie preferences',
      group: columnTitle,
      keywords: ['cookies', 'consent', 'privacy', 'gdpr'],
      action: 'cookie-settings',
    };
  }

  if (link.action === 'bug-report') {
    return {
      title: link.label,
      href: context === 'app' ? '#' : bugReportHref(urls),
      snippet: 'Submit a product issue or regression',
      group: columnTitle,
      keywords: ['bug', 'issue', 'support', 'feedback'],
      action: 'bug-report',
    };
  }

  return {
    title: link.label,
    href: resolveFooterHref(link, context, urls),
    snippet: `Open ${link.label}`,
    group: columnTitle,
    keywords: [link.label.toLowerCase(), columnTitle.toLowerCase()],
  };
};

/** Static entries that are not derived from Drakkar nav/footer config. */
const SUITE_SEARCH_EXTRAS: readonly Omit<SuiteSearchItem, 'href'>[] = [
  {
    title: 'Viking-UI Components',
    snippet: 'Browse the design system showcase',
    group: 'Resources',
    keywords: ['viking', 'ui', 'design system', 'components', 'showcase'],
  },
  {
    title: 'Design tokens',
    snippet: 'Canonical --viking-* token matrix',
    group: 'Resources',
    keywords: ['tokens', 'theme', 'css', 'variables'],
  },
  {
    title: 'API reference',
    snippet: 'OpenAPI schema and REST endpoints',
    group: 'Resources',
    keywords: ['api', 'openapi', 'swagger', 'rest'],
  },
];

const resolveExtraHref = (
  extra: (typeof SUITE_SEARCH_EXTRAS)[number],
  context: SiteDrakkarContext,
  urls: SiteUrls,
): string => {
  switch (extra.title) {
    case 'Viking-UI Components':
      return 'https://ui.dataengineeringformachinelearning.com/components';
    case 'Design tokens':
      return 'https://ui.dataengineeringformachinelearning.com/tokens';
    case 'API reference':
      return `${urls.backend.replace(/\/$/, '')}/api/docs`;
    default:
      return context === 'app' ? urls.app : urls.marketing;
  }
};

/** Viking-UI docs site entries (ui.dataengineeringformachinelearning.com). */
const DOCS_SEARCH_EXTRAS: readonly SuiteSearchItem[] = [
  {
    title: 'Components',
    href: '/components',
    snippet: 'Browse all documented primitives',
    group: 'Viking-UI',
    keywords: ['components', 'showcase', 'registry'],
  },
  {
    title: 'Playground',
    href: '/playground',
    snippet: 'Live Web Component sandbox',
    group: 'Viking-UI',
    keywords: ['playground', 'sandbox', 'demo'],
  },
  {
    title: 'Architecture',
    href: '/architecture',
    snippet: 'CSS + WC + Angular layers',
    group: 'Viking-UI',
    keywords: ['architecture', 'layers', 'web component'],
  },
  {
    title: 'Design tokens',
    href: '/tokens',
    snippet: 'Canonical --viking-* token matrix',
    group: 'Viking-UI',
    keywords: ['tokens', 'theme', 'css', 'variables'],
  },
  {
    title: 'Theming',
    href: '/theming',
    snippet: 'Light/dark mode and sync pipeline',
    group: 'Viking-UI',
    keywords: ['theming', 'dark', 'light', 'mode'],
  },
  {
    title: 'Framework guides',
    href: '/frameworks',
    snippet: 'Angular, Astro, Django setup',
    group: 'Viking-UI',
    keywords: ['frameworks', 'angular', 'astro', 'django'],
  },
  {
    title: 'Contributing',
    href: '/contributing',
    snippet: 'Extend the Viking-UI kit',
    group: 'Viking-UI',
    keywords: ['contributing', 'extend', 'primitives'],
  },
];

const resolveDocsHref = (href: string, docsOrigin: string): string =>
  href.startsWith('http')
    ? href
    : `${docsOrigin.replace(/\/$/, '')}${href.startsWith('/') ? href : `/${href}`}`;

/**
 * Builds curated command-palette links for deml.app, marketing, backend, and docs.
 * Used by the static widget and Angular `viking-suite-search-palette`.
 */
export const buildSuiteSearchItems = (
  context: SiteDrakkarContext,
  urls: SiteUrls,
  options?: { docsOrigin?: string },
): SuiteSearchItem[] => {
  const paletteContext = context === 'docs' ? 'marketing' : context;

  const items: SuiteSearchItem[] = [
    ...SITE_NAV_LINKS.map(link => navItem(link, paletteContext, urls)),
    ...SITE_FOOTER_COLUMNS.flatMap(column =>
      column.links.map(link => footerItem(link, column.title, paletteContext, urls)),
    ),
    ...SUITE_SEARCH_EXTRAS.map(extra => ({
      ...extra,
      href: resolveExtraHref(extra, paletteContext, urls),
    })),
  ];

  if (context === 'app') {
    items.push(
      {
        title: 'Settings',
        href: '/settings',
        snippet: 'Workspace domains, billing, and security',
        group: 'Platform',
        keywords: ['settings', 'sites', 'workspace', 'configuration'],
      },
      {
        title: 'Billing & subscription',
        href: '/settings/billing',
        snippet: 'Manage plan, invoices, and payment methods',
        group: 'Platform',
        keywords: ['billing', 'stripe', 'subscription', 'payment'],
      },
      {
        title: 'Security settings',
        href: '/settings/security',
        snippet: 'Keys, sessions, and access controls',
        group: 'Platform',
        keywords: ['security', 'keys', 'auth', 'rbac'],
      },
    );
  }

  if (context === 'docs') {
    const docsOrigin = options?.docsOrigin ?? 'https://ui.dataengineeringformachinelearning.com';
    items.push(
      ...DOCS_SEARCH_EXTRAS.map(extra => ({
        ...extra,
        href: resolveDocsHref(extra.href, docsOrigin),
      })),
    );
  }

  return dedupeItems(items);
};
