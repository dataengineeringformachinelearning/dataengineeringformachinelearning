export const SITE_NAME = "DEML (DATA ENGINEERING FOR MACHINE LEARNING)";
export const SITE_SHORT_NAME = "DEML";
export const DEFAULT_OG_IMAGE =
  "/data-engineering-for-machine-learning-preview.png";
export const DEFAULT_OG_IMAGE_ALT =
  "DEML platform preview — data engineering and machine learning telemetry dashboard";
export const TWITTER_SITE = "@joealongi";
export const AUTHOR_NAME = "Joe Alongi";

export const DEFAULT_KEYWORDS =
  "data engineering, machine learning, MLOps, operational intelligence, telemetry, threat intelligence, STIX, multi-tenant SaaS, event projections, SLA forecasting";

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
      "Operational intelligence for mission-critical ML pipelines — real-time telemetry, SLA forecasting, and tenant-safe event projections.",
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
      "Precision-engineered observability and ML platform: ingest telemetry, forecast SLA breach, serialize threats to STIX, and project live state per tenant.",
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
