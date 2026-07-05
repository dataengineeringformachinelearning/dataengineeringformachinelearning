// Builds static site-drakkar JSON, viking-icon-paths, and Django partials from site-drakkar.config.ts.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.join(dirname, '..');
const rootDir = path.join(frontendDir, '..');
const vikingUiDir = path.join(rootDir, 'packages', 'viking-ui', 'src');

if (!fs.existsSync(vikingUiDir)) {
  console.log('Skipping build_site_drakkar: packages/viking-ui is not available in this checkout.');
  process.exit(0);
}

/** Hardcoded extractors — avoids dynamic RegExp (Semgrep ReDoS rule). */
const EXPORT_ARRAY_PATTERNS = {
  SITE_NAV_LINKS: /export const SITE_NAV_LINKS[\s\S]*?= (\[[\s\S]*?\]) as const/,
  SITE_FOOTER_COLUMNS: /export const SITE_FOOTER_COLUMNS[\s\S]*?= (\[[\s\S]*?\]) as const/,
};

const EXPORT_OBJECT_PATTERNS = {
  LUCIDE_ICON_PATHS: /export const LUCIDE_ICON_PATHS = (\{[\s\S]*?\}) as const/,
  VIKING_BRAND_ICON_PATHS: /export const VIKING_BRAND_ICON_PATHS = (\{[\s\S]*?\}) as const/,
  VIKING_DRAKKAR_ICON_PATHS: /export const VIKING_DRAKKAR_ICON_PATHS = (\{[\s\S]*?\}) as const/,
  VIKING_INTEGRATION_ICON_PATHS:
    /export const VIKING_INTEGRATION_ICON_PATHS = (\{[\s\S]*?\}) as const/,
  VIKING_BRAND_ICON_FILLED_PATHS:
    /export const VIKING_BRAND_ICON_FILLED_PATHS[\s\S]*?= (\{[\s\S]*?\});/,
  VIKING_DRAKKAR_ICON_FILLED_PATHS:
    /export const VIKING_DRAKKAR_ICON_FILLED_PATHS[\s\S]*?= (\{[\s\S]*?\});/,
};

const readJsonFromTsExport = (filePath, exportName) => {
  const pattern = EXPORT_ARRAY_PATTERNS[exportName];
  if (!pattern) {
    throw new Error(`No extractor registered for ${exportName}`);
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(pattern);
  if (!match) {
    throw new Error(`Could not extract ${exportName} from ${filePath}`);
  }
  return Function(`"use strict"; return (${match[1]});`)();
};

const siteDrakkarConfigPath = path.join(
  vikingUiDir,
  'lib',
  'site-drakkar',
  'site-drakkar.config.ts',
);
const iconsPath = path.join(vikingUiDir, 'core', 'icons.ts');

const siteDrakkar = {
  navLinks: readJsonFromTsExport(siteDrakkarConfigPath, 'SITE_NAV_LINKS'),
  footerColumns: readJsonFromTsExport(siteDrakkarConfigPath, 'SITE_FOOTER_COLUMNS'),
  defaultUrls: {
    app: 'https://deml.app',
    marketing: 'https://dataengineeringformachinelearning.com',
    backend: 'https://backend.deml.app',
  },
};

const iconsContent = fs.readFileSync(iconsPath, 'utf8');
const lucidePath = path.join(vikingUiDir, 'core', 'lucide-paths.generated.ts');
const brandPath = path.join(vikingUiDir, 'core', 'brand-icons.ts');
const integrationBrandPath = path.join(vikingUiDir, 'core', 'integration-brand-icons.ts');

const readObjectExport = (filePath, exportName) => {
  const pattern = EXPORT_OBJECT_PATTERNS[exportName];
  if (!pattern) {
    throw new Error(`No extractor registered for ${exportName}`);
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(pattern);
  if (!match) {
    throw new Error(`Could not extract ${exportName} from ${filePath}`);
  }
  return Function(`"use strict"; return (${match[1]});`)();
};

const readIntegrationIconPaths = () => {
  const content = fs.readFileSync(integrationBrandPath, 'utf8');
  const match = content.match(/const VIKING_INTEGRATION_BRAND_PATHS[^=]*=\s*(\{[\s\S]*?\n\});/);
  if (!match) {
    throw new Error(
      `Could not extract VIKING_INTEGRATION_BRAND_PATHS from ${integrationBrandPath}`,
    );
  }
  const paths = Function(`"use strict"; return (${match[1]});`)();
  return Object.fromEntries(Object.entries(paths).map(([name, d]) => [name, `<path d="${d}"/>`]));
};

let iconPaths = {};
let iconFilledPaths = {};
try {
  iconPaths = {
    ...readObjectExport(lucidePath, 'LUCIDE_ICON_PATHS'),
    ...readObjectExport(brandPath, 'VIKING_BRAND_ICON_PATHS'),
    ...readObjectExport(brandPath, 'VIKING_DRAKKAR_ICON_PATHS'),
    ...readIntegrationIconPaths(),
  };
  iconFilledPaths = {
    ...readObjectExport(brandPath, 'VIKING_BRAND_ICON_FILLED_PATHS'),
    ...readObjectExport(brandPath, 'VIKING_DRAKKAR_ICON_FILLED_PATHS'),
  };
} catch (error) {
  const iconsMatch = iconsContent.match(/export const VIKING_ICON_PATHS = (\{[\s\S]*?\}) as const/);
  if (!iconsMatch) {
    throw error;
  }
  iconPaths = Function(`"use strict"; return (${iconsMatch[1]});`)();
}

const isAbsoluteUrl = href => /^https?:\/\//i.test(href);

const resolveBackendNavHref = link => {
  if (isAbsoluteUrl(link.appHref)) {
    return link.appHref;
  }
  if (link.platform) {
    return `{{ frontend_url }}${link.appHref}`;
  }
  const pathPart = link.marketingHref.startsWith('/')
    ? link.marketingHref
    : `/${link.marketingHref}`;
  if (pathPart === '/documentation') {
    return '{{ marketing_url }}/documentation/';
  }
  return `{{ marketing_url }}${pathPart}`;
};

const resolveBackendFooterHref = link => {
  if (link.action === 'bug-report') {
    return '{{ frontend_url }}/?reportBug=1';
  }
  if (link.action === 'cookie-settings') {
    return '{{ marketing_url }}/?cookieSettings=1';
  }
  if (isAbsoluteUrl(link.appHref)) {
    return link.appHref;
  }
  if (link.platform) {
    return `{{ frontend_url }}${link.appHref}`;
  }
  const pathPart = link.marketingHref.startsWith('/')
    ? link.marketingHref
    : `/${link.marketingHref}`;
  if (pathPart === '/documentation') {
    return '{{ marketing_url }}/documentation/';
  }
  return `{{ marketing_url }}${pathPart}`;
};

const iconSlot = (name, size = 16) =>
  `<span data-viking-icon="${name}" data-viking-icon-size="${size}" aria-hidden="true"></span>`;

const navLinkHtml = (
  link,
  className,
) => `      <a href="${resolveBackendNavHref(link)}" class="${className}" data-nav-id="${link.id}"${link.requireAuth ? ' data-require-auth="true" hidden' : ''}>
        ${iconSlot(link.icon, 16)}
        <span>${link.label}</span>
      </a>`;

const resolveAstroNavHref = (link, urls) => {
  if (link.platform) {
    return `${urls.app.replace(/\/$/, '')}${link.appHref}`;
  }
  if (isAbsoluteUrl(link.appHref)) {
    return link.appHref;
  }
  const pathPart = link.marketingHref.startsWith('/')
    ? link.marketingHref
    : `/${link.marketingHref}`;
  if (pathPart === '/documentation') {
    return `${urls.marketing.replace(/\/$/, '')}/documentation/`;
  }
  return `${urls.marketing.replace(/\/$/, '')}${pathPart}`;
};

const navLinkAstro = (
  link,
  urls,
  className,
) => `      <a href="${resolveAstroNavHref(link, urls)}" class="${className}" data-nav-id="${link.id}"${link.requireAuth ? ' data-require-auth="true" hidden' : ''}>
        ${iconSlot(link.icon, 16)}
        <span>${link.label}</span>
      </a>`;

const navbarRightWc = (
  loginHrefDesktop,
  loginHrefMobile,
) => `      <div class="navbar-search" role="search">
        <viking-button-wc
          variant="outline"
          square
          compact
          class="navbar-search-trigger"
          role="button"
          aria-label="Open search (⌘K)"
          id="navbar-search-trigger"
        >
          ${iconSlot('search', 20)}
        </viking-button-wc>
      </div>

      <div class="desktop-auth">
        <viking-button-wc variant="primary" class="auth-btn" href="${loginHrefDesktop}" id="auth-btn-desktop">
          <span id="auth-icon-desktop">${iconSlot('arrow-right', 16)}</span>
          <span id="auth-text-desktop">Sign In</span>
        </viking-button-wc>
        <viking-button-wc
          variant="ghost"
          class="auth-btn auth-signout-btn"
          id="auth-signout-desktop"
          hidden
        >
          Sign Out
        </viking-button-wc>
      </div>

      <viking-theme-toggle-wc class="theme-toggle-btn" role="button" aria-label="Toggle light and dark theme"></viking-theme-toggle-wc>

      <viking-button-wc variant="outline" square class="menu-toggle-btn" role="button" aria-label="Toggle navigation menu" aria-controls="mobile-menu" aria-expanded="false" id="mobile-menu-btn">
        ${iconSlot('menu', 24)}
      </viking-button-wc>`;

const navbarRightWcAstro = loginHrefExpr => `      <div class="navbar-search" role="search">
        <viking-button-wc
          variant="outline"
          square
          compact
          class="navbar-search-trigger"
          role="button"
          aria-label="Open search (⌘K)"
          id="navbar-search-trigger"
        >
          <span data-viking-icon="search" data-viking-icon-size="20" aria-hidden="true"></span>
        </viking-button-wc>
      </div>

      <div class="desktop-auth">
        <viking-button-wc variant="primary" class="auth-btn" href={${loginHrefExpr}} id="auth-btn-desktop">
          <span id="auth-icon-desktop"><span data-viking-icon="arrow-right" data-viking-icon-size="16" aria-hidden="true"></span></span>
          <span id="auth-text-desktop">Sign In</span>
        </viking-button-wc>
        <viking-button-wc
          variant="ghost"
          class="auth-btn auth-signout-btn"
          id="auth-signout-desktop"
          hidden
        >
          Sign Out
        </viking-button-wc>
      </div>

      <viking-theme-toggle-wc class="theme-toggle-btn" role="button" aria-label="Toggle light and dark theme"></viking-theme-toggle-wc>

      <viking-button-wc variant="outline" square class="menu-toggle-btn" role="button" aria-label="Toggle navigation menu" aria-controls="mobile-menu" aria-expanded="false" id="mobile-menu-btn">
        <span data-viking-icon="menu" data-viking-icon-size="24" aria-hidden="true"></span>
      </viking-button-wc>`;

const mobileAuthWc = loginHrefMobile => `    <viking-button-wc
      variant="primary"
      full-width
      class="mobile-auth-btn auth-btn"
      href="${loginHrefMobile}"
      id="auth-btn-mobile"
    >
      <span id="auth-icon-mobile">${iconSlot('arrow-right', 16)}</span>
      <span id="auth-text-mobile">Sign In</span>
    </viking-button-wc>
    <viking-button-wc
      variant="ghost"
      full-width
      class="mobile-auth-btn auth-btn auth-signout-btn"
      id="auth-signout-mobile"
      hidden
    >Sign Out</viking-button-wc>`;

const mobileAuthWcAstro = loginHrefExpr => `    <viking-button-wc
      variant="primary"
      full-width
      class="mobile-auth-btn auth-btn"
      href={${loginHrefExpr}}
      id="auth-btn-mobile"
    >
      <span id="auth-icon-mobile"><span data-viking-icon="arrow-right" data-viking-icon-size="16" aria-hidden="true"></span></span>
      <span id="auth-text-mobile">Sign In</span>
    </viking-button-wc>
    <viking-button-wc
      variant="ghost"
      full-width
      class="mobile-auth-btn auth-btn auth-signout-btn"
      id="auth-signout-mobile"
      hidden
    >Sign Out</viking-button-wc>`;

const generateSiteNavbarHtml = navLinks => `{% load static %}
{# AUTO-GENERATED by frontend/scripts/build_site_drakkar.mjs — do not edit by hand #}
<script>
  window.__DEML = {
    FRONTEND_URL: "{{ frontend_url|escapejs }}",
    BACKEND_URL: "{{ request.scheme }}://{{ request.get_host }}",
    MARKETING_URL: "{{ marketing_url|escapejs }}",
    USE_ALGOLIA_SEARCH: true,
  };
</script>
<header class="navbar">
  <div class="navbar-content">
    <div class="navbar-left">
      <a
        href="{{ marketing_url }}/"
        class="navbar-brand"
        aria-label="Go to homepage"
        id="navbar-brand-link"
      >
        <span
          class="brand-icon navbar-logo"
          data-viking-icon="drakkar"
          data-viking-icon-color="accent"
          data-viking-icon-size="28"
          aria-hidden="true"
        ></span>
      </a>
    </div>

    <nav class="navbar-center desktop-nav" aria-label="Main navigation">
${navLinks.map(link => navLinkHtml(link, 'nav-btn')).join('\n')}
    </nav>

    <div class="navbar-right">
${navbarRightWc('{{ frontend_url }}/login', '{{ frontend_url }}/login')}
    </div>
  </div>

  <nav class="mobile-menu" id="mobile-menu" aria-label="Mobile navigation" hidden>
${navLinks.map(link => navLinkHtml(link, 'mobile-nav-btn')).join('\n')}

    <div class="mobile-divider"></div>

${mobileAuthWc('{{ frontend_url }}/login')}
  </nav>
</header>
<div id="autocomplete" class="algolia-autocomplete-host" aria-hidden="true"></div>
<script src="{% static 'widgets/navbar.js' %}" defer></script>
<script type="module" src="{% static 'viking-ui-elements.js' %}"></script>
<script src="{% static 'widgets/command-palette.js' %}" defer></script>
<script src="{% static 'widgets/algolia-search.js' %}" defer></script>
`;

const generateSiteNavbarAstro = (navLinks, variant = 'marketing') => {
  const isDocs = variant === 'docs';
  const imports = isDocs
    ? `import { SITE } from '../lib/site';
import {
  SITE_NAV_LINKS,
  resolveNavHref,
  resolveBrandHref,
} from '@dataengineeringformachinelearning/viking-ui/site-drakkar';`
    : `import { siteEnv } from '../lib/site-env';
import {
  SITE_NAV_LINKS,
  resolveNavHref,
  resolveBrandHref,
} from '@dataengineeringformachinelearning/viking-ui/site-drakkar';`;

  const setup = isDocs
    ? `const urls = { app: SITE.app, marketing: SITE.marketing, backend: 'https://backend.deml.app' };
const navLinks = SITE_NAV_LINKS;
const brandHref = resolveBrandHref('marketing', urls);
const FRONTEND_URL = SITE.app;
const MARKETING_URL = SITE.marketing;
const BACKEND_URL = 'https://backend.deml.app';
const returnUrl = SITE.url;`
    : `const { FRONTEND_URL, BACKEND_URL, MARKETING_URL } = siteEnv();
const urls = { app: FRONTEND_URL, marketing: MARKETING_URL, backend: BACKEND_URL };
const navLinks = SITE_NAV_LINKS;
const brandHref = resolveBrandHref('marketing', urls);
const returnUrl = MARKETING_URL;`;

  const navLinkBlock = className => `{navLinks.map((link) => (
      <a
        href={resolveNavHref(link, 'marketing', urls)}
        class="${className}"
        data-nav-id={link.id}
        {...(link.requireAuth ? { 'data-require-auth': 'true', hidden: true } : {})}
      >
        <span data-viking-icon={link.icon} data-viking-icon-size="16" aria-hidden="true"></span>
        <span>{link.label}</span>
      </a>
    ))}`;

  const loginHrefExpr = '`${FRONTEND_URL}/login?returnUrl=${encodeURIComponent(returnUrl)}`';

  return `---
/** AUTO-GENERATED by frontend/scripts/build_site_drakkar.mjs — do not edit by hand */
${imports}
${setup}
---

<script define:vars={{ FRONTEND_URL, BACKEND_URL, MARKETING_URL, returnUrl }}>
  window.__DEML = {
    FRONTEND_URL,
    BACKEND_URL,
    MARKETING_URL,
    USE_ALGOLIA_SEARCH: true,
  };
</script>

<header class="navbar">
  <div class="navbar-content">
    <div class="navbar-left">
      <a href={brandHref} class="navbar-brand" aria-label="Go to homepage" id="navbar-brand-link">
        <span
          class="brand-icon navbar-logo"
          data-viking-icon="drakkar"
          data-viking-icon-color="accent"
          data-viking-icon-size="28"
          aria-hidden="true"
        ></span>
      </a>
    </div>

    <nav class="navbar-center desktop-nav" aria-label="Main navigation">
      ${navLinkBlock('nav-btn')}
    </nav>

    <div class="navbar-right">
${navbarRightWcAstro(loginHrefExpr)}
    </div>
  </div>

  <nav class="mobile-menu" id="mobile-menu" aria-label="Mobile navigation" hidden>
    ${navLinkBlock('mobile-nav-btn')}

    <div class="mobile-divider"></div>

${mobileAuthWcAstro(loginHrefExpr)}
  </nav>
</header>

<div id="autocomplete" class="algolia-autocomplete-host" aria-hidden="true"></div>

<script is:inline src="/assets/widgets/navbar.js" defer></script>
<script is:inline src="/assets/widgets/command-palette.js" defer></script>
<script is:inline src="/assets/widgets/algolia-search.js" defer></script>
`;
};

const generateSiteFooterHtml = footerColumns => `{% load static %}
{# AUTO-GENERATED by frontend/scripts/build_site_drakkar.mjs — do not edit by hand #}
<footer class="mega-footer">
  <div class="footer-content">
    <nav class="footer-directory" aria-label="Footer Directory">
${footerColumns
  .map(
    column => `      <div class="footer-column">
        <h3 class="footer-column-title">${column.title}</h3>
        <ul class="footer-list">
${column.links
  .map(link => `          <li><a href="${resolveBackendFooterHref(link)}">${link.label}</a></li>`)
  .join('\n')}
        </ul>
      </div>`,
  )
  .join('\n')}
    </nav>
    <section class="footer-bottom">
      <div class="footer-badges-top">
        <span class="usa-badge" id="usa-badge">
          <span class="usa-badge-icon" aria-hidden="true">🇺🇸</span>
          <span>Made in the U.S.A</span>
        </span>
      </div>
      <div class="footer-compliance-row">
        <div class="copyright-info">
          <span class="copyright-text">
            Copyright © {% now "Y" %} Data Engineering for Machine Learning by
            <a href="https://joealongi.dev/" target="_blank" rel="noopener noreferrer">Joe Alongi</a>.
            All rights reserved.
          </span>
        </div>
      </div>
    </section>
  </div>
</footer>

<script>
  (function () {
    const USA_CONFETTI_COLORS = ['#ff0000', '#ffffff', '#0000ff'];
    const confettiSrc =
      'https://cdn.jsdelivr.net/npm/canvas-confetti@1/dist/confetti.browser.min.js';
    const confettiLoad = (window.__DEMlUsaConfettiLoad ??
      (window.__DEMlUsaConfettiLoad = new Promise(resolve => {
        const existing = document.querySelector('script[data-deml-usa-confetti]');
        if (window.confetti) {
          resolve(window.confetti);
          return;
        }
        const script = existing ?? document.createElement('script');
        if (!existing) {
          script.src = confettiSrc;
          script.async = true;
          script.setAttribute('data-deml-usa-confetti', '1');
          script.onload = () => resolve(window.confetti);
          script.onerror = () => resolve(null);
          document.body.appendChild(script);
        } else {
          script.addEventListener('load', () => resolve(window.confetti));
          script.addEventListener('error', () => resolve(null));
        }
      })));

    const fireUsaConfetti = async target => {
      const confetti = await confettiLoad;
      if (typeof confetti !== 'function') {
        return;
      }
      const rect = target.getBoundingClientRect();
      confetti({
        particleCount: 50,
        spread: 60,
        colors: USA_CONFETTI_COLORS,
        disableForReducedMotion: true,
        zIndex: 9999,
        origin: {
          x: (rect.left + rect.width / 2) / window.innerWidth,
          y: (rect.top + rect.height / 2) / window.innerHeight,
        },
      });
    };

    const bindUsaBadgeConfetti = () => {
      const usaBadge = document.getElementById('usa-badge');
      if (!usaBadge || usaBadge.dataset.confettiBound === 'true') {
        return;
      }
      usaBadge.dataset.confettiBound = 'true';
      usaBadge.addEventListener('mouseenter', event => {
        fireUsaConfetti(event.currentTarget);
      });
      usaBadge.addEventListener('focusin', event => {
        fireUsaConfetti(event.currentTarget);
      });
      usaBadge.addEventListener('click', event => {
        event.preventDefault();
        fireUsaConfetti(event.currentTarget);
      });
      usaBadge.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          fireUsaConfetti(event.currentTarget);
        }
      });
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bindUsaBadgeConfetti);
    } else {
      bindUsaBadgeConfetti();
    }
  })();
</script>
`;

const outputs = [
  path.join(frontendDir, 'public', 'assets', 'site-drakkar.json'),
  path.join(frontendDir, 'src', 'assets', 'site-drakkar.json'),
  path.join(rootDir, 'marketing', 'public', 'assets', 'site-drakkar.json'),
  path.join(rootDir, 'backend', 'static', 'assets', 'site-drakkar.json'),
  path.join(rootDir, 'viking-ui-docs', 'public', 'assets', 'site-drakkar.json'),
];

const iconOutputs = [
  path.join(frontendDir, 'public', 'assets', 'viking-icon-paths.json'),
  path.join(frontendDir, 'src', 'assets', 'viking-icon-paths.json'),
  path.join(rootDir, 'marketing', 'public', 'assets', 'viking-icon-paths.json'),
  path.join(rootDir, 'backend', 'static', 'assets', 'viking-icon-paths.json'),
  path.join(rootDir, 'viking-ui-docs', 'public', 'assets', 'viking-icon-paths.json'),
];

const iconFilledOutputs = [
  path.join(frontendDir, 'public', 'assets', 'viking-icon-filled-paths.json'),
  path.join(frontendDir, 'src', 'assets', 'viking-icon-filled-paths.json'),
  path.join(rootDir, 'marketing', 'public', 'assets', 'viking-icon-filled-paths.json'),
  path.join(rootDir, 'backend', 'static', 'assets', 'viking-icon-filled-paths.json'),
  path.join(rootDir, 'viking-ui-docs', 'public', 'assets', 'viking-icon-filled-paths.json'),
];

const templateOutputs = [
  {
    path: path.join(rootDir, 'backend', 'templates', 'partials', 'site_navbar.html'),
    content: generateSiteNavbarHtml(siteDrakkar.navLinks),
  },
  {
    path: path.join(rootDir, 'backend', 'templates', 'partials', 'site_footer.html'),
    content: generateSiteFooterHtml(siteDrakkar.footerColumns),
  },
  {
    path: path.join(rootDir, 'marketing', 'src', 'components', 'Navbar.astro'),
    content: generateSiteNavbarAstro(siteDrakkar.navLinks, 'marketing'),
  },
  {
    path: path.join(rootDir, 'viking-ui-docs', 'src', 'components', 'SiteNavbar.astro'),
    content: generateSiteNavbarAstro(siteDrakkar.navLinks, 'docs'),
  },
];

for (const out of outputs) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(siteDrakkar, null, 2)}\n`);
}

for (const out of iconOutputs) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(iconPaths, null, 2)}\n`);
}

for (const out of iconFilledOutputs) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(iconFilledPaths, null, 2)}\n`);
}

for (const { path: outPath, content } of templateOutputs) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, content);
}

const faviconSource = path.join(
  rootDir,
  'packages',
  'viking-ui',
  'src',
  'assets',
  'drakkar-favicon.svg',
);
const faviconOutputs = [
  path.join(frontendDir, 'public', 'favicon.svg'),
  path.join(rootDir, 'marketing', 'public', 'favicon.svg'),
  path.join(rootDir, 'backend', 'static', 'favicon.svg'),
];
const navbarSource = path.join(frontendDir, 'src', 'assets', 'widgets', 'navbar.js');
const navbarOutputs = [
  path.join(frontendDir, 'public', 'assets', 'widgets', 'navbar.js'),
  path.join(rootDir, 'marketing', 'public', 'assets', 'widgets', 'navbar.js'),
  path.join(rootDir, 'backend', 'static', 'widgets', 'navbar.js'),
  path.join(rootDir, 'viking-ui-docs', 'public', 'assets', 'widgets', 'navbar.js'),
];

for (const out of faviconOutputs) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.copyFileSync(faviconSource, out);
}

for (const out of navbarOutputs) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.copyFileSync(navbarSource, out);
}

console.log(
  'Wrote site-drakkar.json, viking-icon-paths.json, viking-icon-filled-paths.json, favicon.svg, and navbar.js to frontend, marketing, backend, and viking-ui-docs assets.',
);
console.log(
  'Wrote backend/templates/partials/site_navbar.html, site_footer.html, marketing Navbar.astro, and viking-ui-docs SiteNavbar.astro from site-drakkar.config.ts.',
);
