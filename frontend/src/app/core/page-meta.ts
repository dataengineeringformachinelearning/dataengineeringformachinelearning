export interface PageMeta {
  title: string;
  description: string;
}

const DEFAULT_DESCRIPTION =
  'A production-grade, multi-tenant platform for Data Engineering and Machine Learning. Monitor infrastructure, stream telemetry, and leverage advanced AI integrations.';

/** Distinct document titles and descriptions per frontend route segment. */
export const ROUTE_PAGE_META: Record<string, PageMeta> = {
  '': {
    title: 'Sign In - DEML APP',
    description:
      'Secure sign-in to the DEML application. Access your dashboard, telemetry, and threat intelligence workspace.',
  },
  login: {
    title: 'Sign In - DEML APP',
    description:
      'Secure sign-in to the DEML application. Access your dashboard, telemetry, and threat intelligence workspace.',
  },
  dashboard: {
    title: 'Dashboard - DEML APP',
    description:
      'Real-time telemetry, threat scores, and operational metrics for your DEML workspace.',
  },
  explore: {
    title: 'Explore Public Status Pages - DEML APP',
    description: 'Browse public status pages and uptime monitors published on the DEML platform.',
  },
  status: {
    title: 'Service Status Dashboard - DEML APP',
    description: 'Platform-wide service health, incident history, and uptime summaries.',
  },
  settings: {
    title: 'Site Setup - DEML APP',
    description: 'Configure monitors, embed widgets, and manage site-level DEML integrations.',
  },
  account: {
    title: 'Account - DEML APP',
    description: 'Manage your DEML profile, billing tier, API access, and security settings.',
  },
  vulnerabilities: {
    title: 'Threat Matrix & Vulnerability Center - DEML APP',
    description:
      'Unified triage for Semgrep, Trivy, and behavioral threat findings across your estate.',
  },
  analytics: {
    title: 'Analytics - DEML APP',
    description:
      'ClickHouse-backed analytics, geo maps, and trend visualizations for your telemetry data.',
  },
  success: {
    title: 'Subscription Successful - DEML APP',
    description: 'Your DEML Pro subscription is active. Return to the dashboard to get started.',
  },
  'auth-status': {
    title: 'Authentication Status - DEML APP',
    description: 'Cross-site authentication handoff endpoint for DEML marketing and app surfaces.',
  },
  '**': {
    title: 'Page Not Found - DEML APP',
    description: 'The requested DEML application page could not be found.',
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
      description: `Live uptime and incident history for the ${title} status page on DEML.`,
    };
  }

  const key = segments[0] ?? '';
  return ROUTE_PAGE_META[key] ?? { title: 'DEML APP', description: DEFAULT_DESCRIPTION };
};
