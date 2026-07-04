/**
 * Viking-UI command palette — curated suite navigation via viking-search-palette-wc.
 * Loads on deml.app, marketing, and backend. Trigger: navbar search button or ⌘K / Ctrl+K.
 */
(() => {
  const PALETTE_ID = 'deml-command-palette';

  const readDemlUrls = () => {
    const env = window.__DEML ?? {};
    return {
      app: env.FRONTEND_URL || 'https://deml.app',
      marketing: env.MARKETING_URL || 'https://dataengineeringformachinelearning.com',
      backend: env.BACKEND_URL || 'https://backend.deml.app',
    };
  };

  const detectContext = () => {
    const explicit = document.documentElement.getAttribute('data-deml-context');
    if (explicit === 'app' || explicit === 'marketing' || explicit === 'backend') {
      return explicit;
    }

    const host = window.location.hostname;
    if (host.includes('deml.app') && !host.startsWith('backend.')) {
      return 'app';
    }
    if (host.startsWith('backend.')) {
      return 'backend';
    }
    return 'marketing';
  };

  const joinBase = (base, path) => {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    const normalizedBase = base.replace(/\/$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${normalizedBase}${normalizedPath}`;
  };

  const resolveNavHref = (link, context, urls) => {
    if (link.platform) {
      return context === 'app' ? link.appHref : joinBase(urls.app, link.appHref);
    }
    if (context === 'app') {
      return link.appHref;
    }
    return link.marketingHref.startsWith('/')
      ? link.marketingHref
      : joinBase(urls.marketing, link.marketingHref);
  };

  const resolveFooterHref = (link, context, urls) => {
    if (link.action === 'bug-report') {
      return context === 'app' ? '#' : `${joinBase(urls.app, '/?reportBug=1')}`;
    }
    if (link.action === 'cookie-settings') {
      const base = urls.marketing.replace(/\/$/, '');
      return `${base}/?cookieSettings=1`;
    }
    if (link.platform) {
      return context === 'app' ? link.appHref : joinBase(urls.app, link.appHref);
    }
    if (context === 'app') {
      return link.appHref;
    }
    return link.marketingHref.startsWith('/')
      ? link.marketingHref
      : joinBase(urls.marketing, link.marketingHref);
  };

  const buildItemsFromDrakkar = (drakkar, context, urls) => {
    const items = [];

    for (const link of drakkar.navLinks ?? []) {
      items.push({
        title: link.label,
        href: resolveNavHref(link, context, urls),
        snippet: `Open ${link.label}`,
        group: 'Platform',
        keywords: [link.id, link.label.toLowerCase()],
      });
    }

    for (const column of drakkar.footerColumns ?? []) {
      for (const link of column.links) {
        const href = resolveFooterHref(link, context, urls);
        items.push({
          title: link.label,
          href,
          snippet: `Open ${link.label}`,
          group: column.title,
          keywords: [link.label.toLowerCase(), column.title.toLowerCase()],
          action: link.action,
        });
      }
    }

    items.push(
      {
        title: 'Viking-UI Components',
        href: 'https://ui.dataengineeringformachinelearning.com/components',
        snippet: 'Browse the design system showcase',
        group: 'Resources',
        keywords: ['viking', 'ui', 'design system', 'components'],
      },
      {
        title: 'Design tokens',
        href: 'https://ui.dataengineeringformachinelearning.com/tokens',
        snippet: 'Canonical --viking-* token matrix',
        group: 'Resources',
        keywords: ['tokens', 'theme', 'css'],
      },
      {
        title: 'API reference',
        href: `${urls.backend.replace(/\/$/, '')}/api/docs`,
        snippet: 'OpenAPI schema and REST endpoints',
        group: 'Resources',
        keywords: ['api', 'openapi', 'swagger'],
      },
    );

    if (context === 'app') {
      items.push(
        {
          title: 'Billing & subscription',
          href: '/settings/billing',
          snippet: 'Manage plan, invoices, and payment methods',
          group: 'Platform',
          keywords: ['billing', 'stripe', 'subscription'],
        },
        {
          title: 'Security settings',
          href: '/settings/security',
          snippet: 'Keys, sessions, and access controls',
          group: 'Platform',
          keywords: ['security', 'keys', 'auth'],
        },
      );
    }

    const seen = new Set();
    return items.filter(item => {
      const key = `${item.title}:${item.href}:${item.action ?? ''}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  };

  let palette = null;
  let itemsLoaded = false;

  const ensureElements = () => {
    if (customElements.get('viking-search-palette-wc')) {
      return;
    }
    window.VikingUI?.registerVikingElements?.();
  };

  const loadItems = async () => {
    const urls = readDemlUrls();
    const context = detectContext();

    try {
      const response = await fetch('/assets/site-drakkar.json', { cache: 'no-cache' });
      if (response.ok) {
        const drakkar = await response.json();
        return buildItemsFromDrakkar(drakkar, context, urls);
      }
    } catch {
      // Fall through to minimal defaults when JSON is unavailable.
    }

    return buildItemsFromDrakkar({ navLinks: [], footerColumns: [] }, context, urls);
  };

  const ensurePalette = async () => {
    ensureElements();

    if (!palette) {
      palette = document.getElementById(PALETTE_ID);
    }

    if (!palette) {
      palette = document.createElement('viking-search-palette-wc');
      palette.id = PALETTE_ID;
      palette.setAttribute('global-shortcut', '');
      palette.setAttribute('placeholder', 'Search documentation, dashboard, settings…');
      document.body.append(palette);
    }

    if (!itemsLoaded) {
      const items = await loadItems();
      palette.setAttribute('items', JSON.stringify(items));
      itemsLoaded = true;
    }

    return palette;
  };

  const openSearch = () => {
    void ensurePalette().then(el => el.openPalette());
  };

  const closeSearch = () => {
    palette?.closePalette?.();
  };

  window.DemlWidgets = window.DemlWidgets || {};
  window.DemlWidgets.openSearch = openSearch;
  window.DemlWidgets.closeSearch = closeSearch;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      void ensurePalette();
    });
  } else {
    void ensurePalette();
  }
})();
