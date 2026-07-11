import type {
  SiteDrakkarContext,
  SiteFooterLink,
  SiteNavLink,
  SiteUrls,
} from "./site-drakkar.config";
import {
  SITE_FOOTER_COLUMNS,
  SITE_NAV_LINKS,
  bugReportHref,
  cookieSettingsHref,
  resolveFooterHref,
  resolveNavHref,
} from "./site-drakkar.config";

/** Curated command-palette entry for cross-surface navigation. */
export type SuiteSearchItem = {
  title: string;
  href: string;
  snippet?: string;
  group?: string;
  keywords?: string[];
  action?: "cookie-settings" | "bug-report";
};

const dedupeItems = (items: SuiteSearchItem[]): SuiteSearchItem[] => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.title}:${item.href}:${item.action ?? ""}`;
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
  group: "Platform",
  keywords: [link.id, link.label.toLowerCase(), "navigate", "go"],
});

const footerItem = (
  link: SiteFooterLink,
  columnTitle: string,
  context: SiteDrakkarContext,
  urls: SiteUrls,
): SuiteSearchItem => {
  if (link.action === "cookie-settings") {
    return {
      title: link.label,
      href: cookieSettingsHref(urls),
      snippet: "Manage analytics and cookie preferences",
      group: columnTitle,
      keywords: ["cookies", "consent", "privacy", "gdpr"],
      action: "cookie-settings",
    };
  }

  if (link.action === "bug-report") {
    return {
      title: link.label,
      href: context === "app" ? "#" : bugReportHref(urls),
      snippet: "Submit a product issue or regression",
      group: columnTitle,
      keywords: ["bug", "issue", "support", "feedback"],
      action: "bug-report",
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
const SUITE_SEARCH_EXTRAS: readonly Omit<SuiteSearchItem, "href">[] = [
  {
    title: "Viking-UI Components",
    snippet: "Browse the design system showcase",
    group: "Resources",
    keywords: ["viking", "ui", "design system", "components", "showcase"],
  },
  {
    title: "Design tokens",
    snippet: "Canonical --viking-* token matrix",
    group: "Resources",
    keywords: ["tokens", "theme", "css", "variables"],
  },
  {
    title: "API reference",
    snippet: "OpenAPI schema and REST endpoints",
    group: "Resources",
    keywords: ["api", "openapi", "swagger", "rest"],
  },
];

const resolveExtraHref = (
  extra: (typeof SUITE_SEARCH_EXTRAS)[number],
  context: SiteDrakkarContext,
  urls: SiteUrls,
): string => {
  switch (extra.title) {
    case "Viking-UI Components":
      return "https://ui.dataengineeringformachinelearning.com/components";
    case "Design tokens":
      return "https://ui.dataengineeringformachinelearning.com/tokens";
    case "API reference":
      return `${urls.backend.replace(/\/$/, "")}/api/v1/docs`;
    default:
      return context === "app" ? urls.app : urls.marketing;
  }
};

/** Viking-UI docs site entries (ui.dataengineeringformachinelearning.com). */
const DOCS_SEARCH_EXTRAS: readonly SuiteSearchItem[] = [
  {
    title: "Components",
    href: "/components",
    snippet: "Browse all documented primitives",
    group: "Viking-UI",
    keywords: ["components", "showcase", "registry"],
  },
  {
    title: "Playground",
    href: "/playground",
    snippet: "Live Web Component sandbox",
    group: "Viking-UI",
    keywords: ["playground", "sandbox", "demo"],
  },
  {
    title: "Architecture",
    href: "/architecture",
    snippet: "CSS + WC + Angular layers",
    group: "Viking-UI",
    keywords: ["architecture", "layers", "web component"],
  },
  {
    title: "Design tokens",
    href: "/tokens",
    snippet: "Canonical --viking-* token matrix",
    group: "Viking-UI",
    keywords: ["tokens", "theme", "css", "variables"],
  },
  {
    title: "Theming",
    href: "/theming",
    snippet: "Light/dark mode and sync pipeline",
    group: "Viking-UI",
    keywords: ["theming", "dark", "light", "mode"],
  },
  {
    title: "Framework guides",
    href: "/frameworks",
    snippet: "Angular, Astro, Django setup",
    group: "Viking-UI",
    keywords: ["frameworks", "angular", "astro", "django"],
  },
  {
    title: "Contributing",
    href: "/contributing",
    snippet: "Extend the Viking-UI kit",
    group: "Viking-UI",
    keywords: ["contributing", "extend", "primitives"],
  },
];

const resolveDocsHref = (href: string, docsOrigin: string): string =>
  href.startsWith("http")
    ? href
    : `${docsOrigin.replace(/\/$/, "")}${href.startsWith("/") ? href : `/${href}`}`;

/**
 * Builds curated command-palette links for deml.app, marketing, backend, and docs.
 * Used by the static widget and Angular `viking-suite-search-palette`.
 */
export const buildSuiteSearchItems = (
  context: SiteDrakkarContext,
  urls: SiteUrls,
  options?: { docsOrigin?: string; authenticated?: boolean },
): SuiteSearchItem[] => {
  const paletteContext = context === "docs" ? "marketing" : context;
  const authenticated = options?.authenticated ?? context === "app";

  const items: SuiteSearchItem[] = [
    ...SITE_NAV_LINKS.filter((link) => !link.requireAuth || authenticated).map(
      (link) => navItem(link, paletteContext, urls),
    ),
    ...SITE_FOOTER_COLUMNS.flatMap((column) =>
      column.links
        .filter((link) => !link.requireAuth || authenticated)
        .map((link) => footerItem(link, column.title, paletteContext, urls)),
    ),
    ...SUITE_SEARCH_EXTRAS.map((extra) => ({
      ...extra,
      href: resolveExtraHref(extra, paletteContext, urls),
    })),
  ];

  if (context === "app") {
    items.push(
      {
        title: "Dashboard",
        href: "/dashboard",
        snippet: "CES overview, KPIs, and performance telemetry",
        group: "App",
        keywords: ["dashboard", "ces", "home", "overview", "kpi"],
      },
      {
        title: "Analytics",
        href: "/analytics",
        snippet: "Latency, origins, threat charts, and gauges",
        group: "App",
        keywords: ["analytics", "charts", "latency", "map", "threat"],
      },
      {
        title: "Explore status pages",
        href: "/explore",
        snippet: "Public status directory",
        group: "App",
        keywords: ["explore", "status", "directory", "public"],
      },
      {
        title: "Status pages",
        href: "/status",
        snippet: "Your published and draft status surfaces",
        group: "App",
        keywords: ["status", "pages", "uptime", "incidents"],
      },
      {
        title: "Platform status",
        href: "/status/platform-status",
        snippet: "Live public sentinel for the DEML stack",
        group: "App",
        keywords: ["platform-status", "tenant0", "health", "sla"],
      },
      {
        title: "Vulnerabilities",
        href: "/vulnerabilities",
        snippet: "SOC triage and vulnerability Kanban",
        group: "App",
        keywords: ["vulnerabilities", "soc", "semgrep", "trivy", "kanban"],
      },
      {
        title: "Account",
        href: "/account",
        snippet: "Profile, MFA enrollment, and linked accounts",
        group: "App",
        keywords: ["account", "profile", "mfa", "oauth"],
      },
      {
        title: "Settings",
        href: "/settings",
        snippet: "Workspace domains, billing, and security",
        group: "App",
        keywords: ["settings", "sites", "workspace", "configuration"],
      },
      {
        title: "Billing & subscription",
        href: "/settings/billing",
        snippet: "Manage plan, invoices, and payment methods",
        group: "App",
        keywords: ["billing", "stripe", "subscription", "payment"],
      },
      {
        title: "Security settings",
        href: "/settings/security",
        snippet: "Keys, sessions, and access controls",
        group: "App",
        keywords: ["security", "keys", "auth", "rbac"],
      },
      {
        title: "Login",
        href: "/login",
        snippet: "Sign in or complete SMS MFA",
        group: "App",
        keywords: ["login", "sign in", "auth", "mfa"],
      },
    );
  }

  if (context === "backend") {
    items.push(
      {
        title: "OpenAPI / Swagger",
        href: `${urls.backend.replace(/\/$/, "")}/api/v1/docs`,
        snippet: "Interactive public ingest and predict sandbox",
        group: "Backend",
        keywords: ["swagger", "openapi", "docs", "api"],
      },
      {
        title: "Backend home",
        href: urls.backend,
        snippet: "API landing and service overview",
        group: "Backend",
        keywords: ["backend", "api", "home"],
      },
    );
  }

  if (context === "docs") {
    const docsOrigin =
      options?.docsOrigin ?? "https://ui.dataengineeringformachinelearning.com";
    items.push(
      ...DOCS_SEARCH_EXTRAS.map((extra) => ({
        ...extra,
        href: resolveDocsHref(extra.href, docsOrigin),
      })),
    );
  }

  return dedupeItems(items);
};
