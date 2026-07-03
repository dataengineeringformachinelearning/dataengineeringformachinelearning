export interface PageMeta {
  title: string;
  description: string;
  robots: string;
  keywords?: string;
  ogType: string;
}

const DEFAULT_DESCRIPTION =
  'A production-grade, multi-tenant platform for Data Engineering and Machine Learning. Monitor infrastructure, stream telemetry, and leverage advanced AI integrations.';

const DEFAULT_KEYWORDS =
  'data engineering, machine learning, MLOps, telemetry, threat intelligence, status pages, multi-tenant SaaS';

const INDEXABLE = 'index, follow';
const NOINDEX = 'noindex, nofollow';

/** Distinct document titles and descriptions per frontend route segment. */
export const ROUTE_PAGE_META: Record<string, PageMeta> = {
  '': {
    title: 'Sign In - DEML APP',
    description:
      'Secure sign-in to the DEML application. Access your dashboard, telemetry, and threat intelligence workspace.',
    robots: INDEXABLE,
    keywords: `${DEFAULT_KEYWORDS}, sign in, authentication`,
    ogType: 'website',
  },
  login: {
    title: 'Sign In - DEML APP',
    description:
      'Secure sign-in to the DEML application. Access your dashboard, telemetry, and threat intelligence workspace.',
    robots: INDEXABLE,
    keywords: `${DEFAULT_KEYWORDS}, sign in, authentication`,
    ogType: 'website',
  },
  dashboard: {
    title: 'Dashboard - DEML APP',
    description:
      'Real-time telemetry, threat scores, and operational metrics for your DEML workspace.',
    robots: NOINDEX,
    ogType: 'website',
  },
  explore: {
    title: 'Explore Public Status Pages - DEML APP',
    description:
      'Browse public status pages and uptime monitors published on the DEML platform. Discover live service health dashboards.',
    robots: INDEXABLE,
    keywords: `${DEFAULT_KEYWORDS}, public status pages, uptime monitors, service health`,
    ogType: 'website',
  },
  status: {
    title: 'Service Status Dashboard - DEML APP',
    description:
      'Platform-wide service health, incident history, and uptime summaries for DEML infrastructure.',
    robots: INDEXABLE,
    keywords: `${DEFAULT_KEYWORDS}, service status, incident history, uptime`,
    ogType: 'website',
  },
  settings: {
    title: 'Sites - DEML APP',
    description: 'Configure monitors, embed widgets, and manage site-level DEML integrations.',
    robots: NOINDEX,
    ogType: 'website',
  },
  account: {
    title: 'Account - DEML APP',
    description: 'Manage your DEML profile, billing tier, API access, and security settings.',
    robots: NOINDEX,
    ogType: 'website',
  },
  vulnerabilities: {
    title: 'Threat Matrix & Vulnerability Center - DEML APP',
    description:
      'Unified triage for Semgrep, Trivy, and behavioral threat findings across your estate.',
    robots: NOINDEX,
    ogType: 'website',
  },
  analytics: {
    title: 'Analytics - DEML APP',
    description:
      'ClickHouse-backed analytics, geo maps, and trend visualizations for your telemetry data.',
    robots: NOINDEX,
    ogType: 'website',
  },
  success: {
    title: 'Subscription Successful - DEML APP',
    description: 'Your DEML Pro subscription is active. Return to the dashboard to get started.',
    robots: NOINDEX,
    ogType: 'website',
  },
  'auth-status': {
    title: 'Authentication Status - DEML APP',
    description: 'Cross-site authentication handoff endpoint for DEML marketing and app surfaces.',
    robots: NOINDEX,
    ogType: 'website',
  },
  '**': {
    title: 'Page Not Found - DEML APP',
    description: 'The requested DEML application page could not be found.',
    robots: NOINDEX,
    ogType: 'website',
  },
};

export const resolveRouteMeta = (url: string): PageMeta => {
  const path = url.split('?')[0]?.split('#')[0] ?? '/';
  const segments = path
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .filter(Boolean);

  if (segments[0] === 'status' && segments.length > 1) {
    const slug = segments.slice(1).join('/');
    const title = slug
      .split(/[-_/]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
    return {
      title: `${title} Status - DEML APP`,
      description: `Live uptime, incident history, and component health for the ${title} public status page on DEML.`,
      robots: INDEXABLE,
      keywords: `${DEFAULT_KEYWORDS}, ${title} status, uptime monitor, incident history`,
      ogType: 'website',
    };
  }

  const key = segments[0] ?? '';
  return (
    ROUTE_PAGE_META[key] ?? {
      title: 'DEML APP',
      description: DEFAULT_DESCRIPTION,
      robots: INDEXABLE,
      keywords: DEFAULT_KEYWORDS,
      ogType: 'website',
    }
  );
};
