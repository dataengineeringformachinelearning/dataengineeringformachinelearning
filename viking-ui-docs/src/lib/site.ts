export const SITE = {
  name: 'Viking-UI',
  title: 'Viking-UI — Precision Design System',
  description:
    'Framework-agnostic design system for DEML — composable primitives, token-driven styling, WCAG 2.1 AA by construction. Angular, Astro, Django, and Web Components.',
  url: 'https://ui.dataengineeringformachinelearning.com',
  github: 'https://github.com/dataengineeringformachinelearning/deml',
  npm: '@dataengineeringformachinelearning/viking-ui',
  marketing: 'https://dataengineeringformachinelearning.com',
  app: 'https://deml.app',
} as const;

export const NAV_LINKS = [
  { href: '/', label: 'Overview' },
  { href: '/components', label: 'Components' },
  { href: '/playground', label: 'Playground' },
  { href: '/architecture', label: 'Architecture' },
  { href: '/tokens', label: 'Tokens' },
  { href: '/theming', label: 'Theming' },
  { href: '/frameworks', label: 'Frameworks' },
  { href: '/contributing', label: 'Contribute' },
] as const;

export type FrameworkTab = 'angular' | 'astro' | 'django' | 'javascript';

export const FRAMEWORK_TABS: { id: FrameworkTab; label: string }[] = [
  { id: 'angular', label: 'Angular' },
  { id: 'astro', label: 'Astro' },
  { id: 'django', label: 'Django / HTML' },
  { id: 'javascript', label: 'Web Components' },
];

/** Docs site page entries for the search palette (component demos are merged at build time). */
export const DOCS_PAGE_SEARCH_ITEMS = [
  { title: 'Components', href: '/components', snippet: 'Browse all documented primitives' },
  { title: 'Playground', href: '/playground', snippet: 'Live Web Component sandbox' },
  { title: 'Architecture', href: '/architecture', snippet: 'CSS + WC + Angular layers' },
  { title: 'Design tokens', href: '/tokens', snippet: 'Canonical --viking-* matrix' },
  { title: 'Theming', href: '/theming', snippet: 'Light/dark mode and sync pipeline' },
  { title: 'Framework guides', href: '/frameworks', snippet: 'Angular, Astro, Django setup' },
  { title: 'Search palette', href: '/components/search-palette', snippet: '⌘K command palette primitive' },
  { title: 'Contributing', href: '/contributing', snippet: 'Extend the Viking-UI kit' },
] as const;
