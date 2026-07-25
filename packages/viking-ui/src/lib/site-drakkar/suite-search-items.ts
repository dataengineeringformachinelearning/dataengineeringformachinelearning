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
    title: "DEML product showcase",
    snippet: "Operational intelligence product home on deml.app",
    group: "Resources",
    keywords: ["deml", "product", "showcase", "docs", "quick start"],
  },
  {
    title: "DEML Swagger",
    snippet: "Interactive DEML control-plane OpenAPI",
    group: "Resources",
    keywords: ["api", "openapi", "swagger", "rest", "deml"],
  },
  {
    title: "DEML ReDoc",
    snippet: "Readable DEML control-plane API reference",
    group: "Resources",
    keywords: ["api", "openapi", "redoc", "rest", "deml"],
  },
  {
    title: "FORJD capabilities",
    snippet: "Public FORJD capability matrix (data plane)",
    group: "Resources",
    keywords: ["api", "capabilities", "forjd", "streaming"],
  },
];

const resolveExtraHref = (
  extra: (typeof SUITE_SEARCH_EXTRAS)[number],
  context: SiteDrakkarContext,
  urls: SiteUrls,
): string => {
  switch (extra.title) {
    case "DEML product showcase":
      return `${urls.app.replace(/\/$/, "")}/`;
    case "DEML Swagger":
      return `${urls.backend.replace(/\/$/, "")}/api/v1/docs`;
    case "DEML ReDoc":
      return `${urls.backend.replace(/\/$/, "")}/api/v1/redoc`;
    case "FORJD capabilities":
      return "https://backend.forjd.co/api/v1/capabilities";
    default:
      return context === "app" ? urls.app : urls.marketing;
  }
};

/**
 * Builds curated command-palette links for deml.app, marketing, and backend.
 * Used by the static widget and Angular `viking-suite-search-palette`.
 */
export const buildSuiteSearchItems = (
  context: SiteDrakkarContext,
  urls: SiteUrls,
  options?: { docsOrigin?: string; authenticated?: boolean },
): SuiteSearchItem[] => {
  const authenticated = options?.authenticated ?? context === "app";

  const items: SuiteSearchItem[] = [
    ...SITE_NAV_LINKS.filter((link) => !link.requireAuth || authenticated).map(
      (link) => navItem(link, context, urls),
    ),
    ...SITE_FOOTER_COLUMNS.flatMap((column) =>
      column.links
        .filter((link) => !link.requireAuth || authenticated)
        .map((link) => footerItem(link, column.title, context, urls)),
    ),
    ...SUITE_SEARCH_EXTRAS.map((extra) => ({
      ...extra,
      href: resolveExtraHref(extra, context, urls),
    })),
  ];

  if (context === "app") {
    items.push(
      {
        title: "Explore status pages",
        href: "/explore",
        snippet: "Public status directory",
        group: "App",
        keywords: ["explore", "status", "directory", "public"],
      },
      {
        title: "Platform status",
        href: "/status/platform-status",
        snippet: "Live public sentinel for the DEML stack",
        group: "App",
        keywords: ["platform-status", "tenant0", "health", "sla"],
      },
      {
        title: "Login",
        href: "/login",
        snippet: "Sign in or complete SMS MFA",
        group: "App",
        keywords: ["login", "sign in", "auth", "mfa"],
      },
    );

    if (authenticated) {
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
          title: "Status pages",
          href: "/status",
          snippet: "Your published and draft status surfaces",
          group: "App",
          keywords: ["status", "pages", "uptime", "incidents"],
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
      );
    }
  }

  if (context === "backend") {
    items.push(
      {
        title: "OpenAPI / Swagger",
        href: `${urls.backend.replace(/\/$/, "")}/api/v1/docs`,
        snippet: "Interactive DEML control-plane sandbox",
        group: "Backend",
        keywords: ["swagger", "openapi", "docs", "api"],
      },
      {
        title: "ReDoc",
        href: `${urls.backend.replace(/\/$/, "")}/api/v1/redoc`,
        snippet: "Readable DEML control-plane reference",
        group: "Backend",
        keywords: ["redoc", "openapi", "docs", "api"],
      },
    );
  }

  return dedupeItems(items);
};
