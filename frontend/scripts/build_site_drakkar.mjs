// Builds static site-drakkar JSON, viking-icon-paths, and Django partials from site-drakkar.config.ts.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.join(dirname, '..');
const rootDir = path.join(frontendDir, '..');
const vikingUiDir = path.join(frontendDir, 'projects', 'viking-ui', 'src', 'lib');

/** Hardcoded extractors — avoids dynamic RegExp (Semgrep ReDoS rule). */
const EXPORT_ARRAY_PATTERNS = {
  SITE_NAV_LINKS: /export const SITE_NAV_LINKS[\s\S]*?= (\[[\s\S]*?\]) as const/,
  SITE_FOOTER_COLUMNS: /export const SITE_FOOTER_COLUMNS[\s\S]*?= (\[[\s\S]*?\]) as const/,
};

const EXPORT_OBJECT_PATTERNS = {
  LUCIDE_ICON_PATHS: /export const LUCIDE_ICON_PATHS = (\{[\s\S]*?\}) as const/,
  VIKING_BRAND_ICON_PATHS: /export const VIKING_BRAND_ICON_PATHS = (\{[\s\S]*?\}) as const/,
  VIKING_DRAKKAR_ICON_PATHS: /export const VIKING_DRAKKAR_ICON_PATHS = (\{[\s\S]*?\}) as const/,
  VIKING_INTEGRATION_ICON_PATHS: /export const VIKING_INTEGRATION_ICON_PATHS = (\{[\s\S]*?\}) as const/,
  VIKING_BRAND_ICON_FILLED_PATHS: /export const VIKING_BRAND_ICON_FILLED_PATHS[\s\S]*?= (\{[\s\S]*?\});/,
  VIKING_DRAKKAR_ICON_FILLED_PATHS: /export const VIKING_DRAKKAR_ICON_FILLED_PATHS[\s\S]*?= (\{[\s\S]*?\});/,
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

const siteDrakkarConfigPath = path.join(vikingUiDir, 'site-drakkar', 'site-drakkar.config.ts');
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
    throw new Error(`Could not extract VIKING_INTEGRATION_BRAND_PATHS from ${integrationBrandPath}`);
  }
  const paths = Function(`"use strict"; return (${match[1]});`)();
  return Object.fromEntries(
    Object.entries(paths).map(([name, d]) => [name, `<path d="${d}"/>`]),
  );
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

const generateSiteNavbarHtml = navLinks => `{% load static %}
{# AUTO-GENERATED by frontend/scripts/build_site_drakkar.mjs — do not edit by hand #}
<script>
  window.__DEML = {
    FRONTEND_URL: "{{ frontend_url|escapejs }}",
    BACKEND_URL: "{{ request.scheme }}://{{ request.get_host }}",
    MARKETING_URL: "{{ marketing_url|escapejs }}",
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
      <div class="navbar-search" role="search">
        <button
          type="button"
          class="navbar-search-trigger"
          aria-label="Open search"
          title="Search (⌘K)"
          onclick="if (window.DemlWidgets) window.DemlWidgets.openSearch();"
        >
          ${iconSlot('search', 20)}
        </button>
      </div>

      <div class="desktop-auth">
        <a href="{{ frontend_url }}/login" class="auth-btn" id="auth-btn-desktop">
          <span id="auth-icon-desktop">${iconSlot('arrow-right', 16)}</span>
          <span id="auth-text-desktop">Sign In</span>
        </a>
        <button type="button" class="auth-signout-btn" id="auth-signout-desktop" hidden>
          Sign Out
        </button>
      </div>

      <button
        type="button"
        class="theme-toggle-btn"
        aria-label="Toggle light and dark theme"
        id="theme-toggle-btn"
      >
        ${iconSlot('sun', 24)}
      </button>

      <button
        type="button"
        class="menu-toggle-btn"
        aria-label="Toggle navigation menu"
        aria-expanded="false"
        id="mobile-menu-btn"
      >
        ${iconSlot('menu', 24)}
      </button>
    </div>
  </div>

  <nav class="mobile-menu" id="mobile-menu" aria-label="Mobile navigation">
${navLinks.map(link => navLinkHtml(link, 'mobile-nav-btn')).join('\n')}

    <div class="mobile-divider"></div>

    <a href="{{ frontend_url }}/login" class="mobile-auth-btn" id="auth-btn-mobile">
      <span id="auth-icon-mobile">${iconSlot('arrow-right', 16)}</span>
      <span id="auth-text-mobile">Sign In</span>
    </a>
    <button type="button" class="mobile-auth-btn auth-signout-btn" id="auth-signout-mobile" hidden>
      Sign Out
    </button>
  </nav>
</header>
<script src="{% static 'widgets/navbar.js' %}" defer></script>
<script type="module" src="{% static 'viking-ui-elements.js' %}"></script>
<script src="{% static 'widgets/command-palette.js' %}" defer></script>
`;

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
`;

const outputs = [
  path.join(frontendDir, 'public', 'assets', 'site-drakkar.json'),
  path.join(frontendDir, 'src', 'assets', 'site-drakkar.json'),
  path.join(rootDir, 'marketing', 'public', 'assets', 'site-drakkar.json'),
  path.join(rootDir, 'backend', 'static', 'assets', 'site-drakkar.json'),
];

const iconOutputs = [
  path.join(frontendDir, 'public', 'assets', 'viking-icon-paths.json'),
  path.join(frontendDir, 'src', 'assets', 'viking-icon-paths.json'),
  path.join(rootDir, 'marketing', 'public', 'assets', 'viking-icon-paths.json'),
  path.join(rootDir, 'backend', 'static', 'assets', 'viking-icon-paths.json'),
];

const iconFilledOutputs = [
  path.join(frontendDir, 'public', 'assets', 'viking-icon-filled-paths.json'),
  path.join(frontendDir, 'src', 'assets', 'viking-icon-filled-paths.json'),
  path.join(rootDir, 'marketing', 'public', 'assets', 'viking-icon-filled-paths.json'),
  path.join(rootDir, 'backend', 'static', 'assets', 'viking-icon-filled-paths.json'),
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
  frontendDir,
  'projects',
  'viking-ui',
  'assets',
  'drakkar-favicon.svg',
);
const faviconOutputs = [
  path.join(frontendDir, 'public', 'favicon.svg'),
  path.join(rootDir, 'marketing', 'public', 'favicon.svg'),
  path.join(rootDir, 'backend', 'static', 'favicon.svg'),
  path.join(frontendDir, 'projects', 'viking-ui-showcase', 'public', 'favicon.svg'),
];
const navbarSource = path.join(frontendDir, 'src', 'assets', 'widgets', 'navbar.js');
const navbarOutputs = [
  path.join(frontendDir, 'public', 'assets', 'widgets', 'navbar.js'),
  path.join(rootDir, 'marketing', 'public', 'assets', 'widgets', 'navbar.js'),
  path.join(rootDir, 'backend', 'static', 'widgets', 'navbar.js'),
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
  'Wrote site-drakkar.json, viking-icon-paths.json, viking-icon-filled-paths.json, favicon.svg, and navbar.js to frontend, marketing, and backend assets.',
);
console.log(
  'Wrote backend/templates/partials/site_navbar.html and site_footer.html from site-drakkar.config.ts.',
);
