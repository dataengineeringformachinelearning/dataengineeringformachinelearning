export const SITE_NAME = "Data Engineering for Machine Learning";
export const SITE_SHORT_NAME = "DEML Community";
export const DEFAULT_OG_IMAGE = "/dataengineeringformachinelearning-social.png";
export const ORGANIZATION_LOGO = "/dataengineeringformachinelearning.png";
export const DEFAULT_OG_IMAGE_ALT =
  "Ship mark for the Data Engineering for Machine Learning community";
export const TWITTER_SITE = "@joealongi";
export const AUTHOR_NAME = "Joe Alongi";

export const DEFAULT_KEYWORDS =
  "FORJD, DEML, data engineering, machine learning, MLOps, community, learning, secure streaming, sealed ingest, telemetry, threat intelligence, STIX, multi-tenant SaaS, defendable architecture";

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
    logo: new URL(ORGANIZATION_LOGO, siteUrl).href,
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
      "Community for learning data engineering for machine learning — FORJD sealed streaming, DEML control-plane companion, field notes, and open reference platforms.",
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
      "DEML learning and control-plane companion for FORJD — identity, billing, consent, dashboards, and status surfaces backed by FORJD sealed streaming.",
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

export function blogPostingJsonLd(
  title: string,
  description: string,
  url: string,
  publishedAt: Date,
  updatedAt?: Date,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description,
    url,
    mainEntityOfPage: url,
    datePublished: publishedAt.toISOString(),
    dateModified: (updatedAt ?? publishedAt).toISOString(),
    author: { "@type": "Person", name: AUTHOR_NAME },
    publisher: { "@type": "Organization", name: SITE_NAME },
  };
}
