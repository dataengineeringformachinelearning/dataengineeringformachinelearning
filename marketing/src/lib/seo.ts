export const SITE_NAME = "DEML (DATA ENGINEERING FOR MACHINE LEARNING)";
export const SITE_SHORT_NAME = "DEML";
export const DEFAULT_OG_IMAGE =
  "/data-engineering-for-machine-learning-preview.png";
export const DEFAULT_OG_IMAGE_ALT =
  "DEML platform preview — data engineering and machine learning telemetry dashboard";
export const TWITTER_SITE = "@joealongi";
export const AUTHOR_NAME = "Joe Alongi";

export const DEFAULT_KEYWORDS =
  "data engineering, machine learning, MLOps, telemetry, threat intelligence, multi-tenant SaaS, event projections";

export function canonicalHref(pathname: string, site: URL | string): string {
  const base = typeof site === "string" ? site : site.href;
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return new URL(normalized, base).href;
}

export function organizationJsonLd(siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: siteUrl,
    logo: new URL(DEFAULT_OG_IMAGE, siteUrl).href,
    sameAs: ["https://twitter.com/joealongi"],
  };
}

export function webSiteJsonLd(siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: siteUrl,
    description:
      "Production-grade data engineering and machine learning platform with real-time telemetry and threat intelligence.",
    author: { "@type": "Person", name: AUTHOR_NAME },
    publisher: { "@type": "Organization", name: SITE_NAME },
  };
}

export function softwareApplicationJsonLd(appUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_SHORT_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: appUrl,
    description:
      "Multi-tenant observability and machine-learning SaaS for telemetry ingestion, status pages, and threat intelligence.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
}

export function webPageJsonLd(title: string, description: string, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: new URL("/", url).href,
    },
  };
}

export function bookJsonLd(title: string, description: string, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Book",
    name: title,
    description,
    url,
    author: { "@type": "Person", name: AUTHOR_NAME },
    inLanguage: "en",
  };
}

export function techArticleJsonLd(
  title: string,
  description: string,
  url: string,
) {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: title,
    description,
    url,
    author: { "@type": "Person", name: AUTHOR_NAME },
    publisher: { "@type": "Organization", name: SITE_NAME },
  };
}
