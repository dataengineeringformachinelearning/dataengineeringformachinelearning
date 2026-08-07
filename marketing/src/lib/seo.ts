export const SITE_NAME = "Data Engineering for Machine Learning";
export const SITE_SHORT_NAME = "DEML Community";
export const DEFAULT_OG_IMAGE = "/dataengineeringformachinelearning-social.png";
export const ORGANIZATION_LOGO = "/dataengineeringformachinelearning.png";
export const DEFAULT_OG_IMAGE_ALT =
  "Ship mark for the Data Engineering for Machine Learning community";
export const TWITTER_SITE = "@joealongi";
export const AUTHOR_NAME = "Joe Alongi";

export const DEFAULT_KEYWORDS =
  "DEML, data engineering, machine learning, MLOps, community, book, whitepaper, blog, documentation, status pages, secure streaming";

export function canonicalHref(pathname: string, site: URL | string): string {
  const base = typeof site === "string" ? site : site.href;
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return new URL(normalized, base).href;
}

export function absoluteAssetUrl(
  assetPath: string,
  siteUrl: string,
): string {
  return new URL(assetPath, siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`)
    .href;
}

export function organizationJsonLd(siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: siteUrl,
    logo: absoluteAssetUrl(ORGANIZATION_LOGO, siteUrl),
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
      "Learn data engineering for machine learning — open book, whitepaper, blog, docs, and community guides from DEML.",
    author: { "@type": "Person", name: AUTHOR_NAME },
    publisher: { "@type": "Organization", name: SITE_NAME },
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

export function blogJsonLd(siteUrl: string, blogUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "DEML Blog",
    description:
      "Platform releases, architecture decisions, and reliability field notes from DEML.",
    url: blogUrl,
    inLanguage: "en",
    publisher: { "@type": "Organization", name: SITE_NAME, url: siteUrl },
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
  imageUrl?: string,
) {
  const image =
    imageUrl ?? absoluteAssetUrl(DEFAULT_OG_IMAGE, new URL("/", url).href);
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description,
    url,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    image: [image],
    datePublished: publishedAt.toISOString(),
    dateModified: (updatedAt ?? publishedAt).toISOString(),
    author: { "@type": "Person", name: AUTHOR_NAME },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: absoluteAssetUrl(ORGANIZATION_LOGO, new URL("/", url).href),
      },
    },
  };
}
