import {
  Marked,
  marked,
  type RendererObject,
} from "marked";

const COMMUNITY_REPOSITORY =
  "https://github.com/dataengineeringformachinelearning/dataengineeringformachinelearning/blob/main";
const DEML_REPOSITORY =
  "https://github.com/dataengineeringformachinelearning/deml/blob/main";

const DEML_ROOT_FILES = new Set(["agents.md", "theme.md", ".cursorrules"]);
const DOCUMENTATION_ONLY_FILES = new Set([
  "apache-spark.md",
  "databricks.md",
  "pytorch.md",
]);
const WHITEPAPER_FRAGMENT_ALIASES = new Map([
  [
    "8-role-based-attribute-based-access-control-rbac-abac",
    "9-role-based-attribute-based-access-control-rbac-abac",
  ],
]);

export interface PublicationHeading {
  id: string;
  key: string;
  text: string;
}

export interface PublicationMarkdownOptions {
  headingCounts?: Map<string, number>;
  headingTargets?: ReadonlyMap<string, string>;
  stripLeadingH1?: boolean;
}

const escapeAttribute = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

/**
 * Normalize both rendered heading IDs and legacy GitHub-style fragments to the
 * same stable key. Collapsing punctuation also resolves historical `--`
 * fragments produced by ampersands in the synced source documents.
 */
export function normalizePublicationAnchor(value: string): string {
  return decodeURIComponent(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&(?:amp|lt|gt|quot|#39);/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/[`*_~[\](){}]/g, " ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const sourceWithoutLeadingH1 = (markdown: string): string =>
  markdown.replace(/^\s*#\s+[^\n]*(?:\n|$)/, "").trimStart();

export function collectPublicationHeadings(
  markdown: string,
  headingCounts = new Map<string, number>(),
): PublicationHeading[] {
  const headings: PublicationHeading[] = [];

  for (const token of marked.lexer(markdown)) {
    if (token.type !== "heading") continue;
    const key = normalizePublicationAnchor(token.text) || "section";
    const occurrence = (headingCounts.get(key) ?? 0) + 1;
    headingCounts.set(key, occurrence);
    headings.push({
      id: occurrence === 1 ? key : `${key}-${occurrence}`,
      key,
      text: token.text,
    });
  }

  return headings;
}

const splitHref = (href: string): { path: string; fragment: string } => {
  const hashIndex = href.indexOf("#");
  if (hashIndex === -1) return { path: href, fragment: "" };
  return {
    path: href.slice(0, hashIndex),
    fragment: href.slice(hashIndex + 1),
  };
};

const cleanRepositoryPath = (value: string): string =>
  value
    .replaceAll("\\", "/")
    .replace(/^\.?\//, "")
    .replace(/^(?:\.\.\/)+/, "");

const appendFragment = (href: string, fragment: string): string =>
  fragment ? `${href}#${fragment}` : href;

const resolveHeadingTarget = (
  targets: ReadonlyMap<string, string>,
  key: string,
): string | undefined => {
  const exact = targets.get(key);
  if (exact) return exact;
  const compactKey = key.replaceAll("-", "");
  for (const [candidate, href] of targets) {
    if (candidate.replaceAll("-", "") === compactKey) return href;
  }
  return undefined;
};

export function rewritePublicationHref(
  href: string,
  headingTargets: ReadonlyMap<string, string> = new Map(),
): string {
  const trimmed = href.trim();
  if (!trimmed) return trimmed;

  const { path, fragment } = splitHref(trimmed);
  const fragmentKey = fragment ? normalizePublicationAnchor(fragment) : "";

  if (!path) {
    return (
      (fragmentKey
        ? resolveHeadingTarget(headingTargets, fragmentKey)
        : undefined) ?? appendFragment("", fragmentKey)
    );
  }

  if (
    path.startsWith("/") ||
    /^[a-z][a-z0-9+.-]*:/i.test(path) ||
    path.startsWith("//")
  ) {
    return trimmed;
  }

  const repositoryPath = cleanRepositoryPath(path);
  const lowerPath = repositoryPath.toLowerCase();
  const baseName = lowerPath.split("/").at(-1) ?? lowerPath;

  if (baseName === "book.md") {
    const target = fragmentKey
      ? resolveHeadingTarget(headingTargets, fragmentKey)
      : undefined;
    if (target) {
      return target;
    }
    return "/book/";
  }

  if (baseName === "whitepaper.md" || baseName === "whiteaper.md") {
    const whitepaperFragment =
      WHITEPAPER_FRAGMENT_ALIASES.get(fragmentKey) ?? fragmentKey;
    return appendFragment(
      "/whitepaper",
      whitepaperFragment ? `section-${whitepaperFragment}` : "",
    );
  }

  if (
    DOCUMENTATION_ONLY_FILES.has(baseName) ||
    lowerPath === "docs/integrations" ||
    lowerPath.startsWith("docs/integrations/")
  ) {
    return "/documentation";
  }

  if (baseName === "readme.md" && fragmentKey === "official-integrations") {
    return "/documentation";
  }

  const isRepositoryReference =
    lowerPath.endsWith(".md") ||
    lowerPath.endsWith(".json") ||
    baseName === ".cursorrules";
  if (!isRepositoryReference) return trimmed;

  const usesDemlRepository =
    DEML_ROOT_FILES.has(lowerPath) ||
    lowerPath.startsWith("infrastructure/") ||
    lowerPath.startsWith("docs/") &&
      !lowerPath.startsWith("docs/suite_") &&
      lowerPath !== "docs/vercel.md";
  const repository = usesDemlRepository
    ? DEML_REPOSITORY
    : COMMUNITY_REPOSITORY;

  return appendFragment(
    `${repository}/${repositoryPath}`,
    fragmentKey,
  );
}

const publicationRenderer = (
  headings: PublicationHeading[],
  headingTargets: ReadonlyMap<string, string>,
): RendererObject => {
  let headingIndex = 0;

  return {
    heading({ tokens, depth }) {
      const heading = headings[headingIndex];
      headingIndex += 1;
      // The surrounding Astro page owns the single document H1.
      const safeDepth = Math.max(2, depth);
      const id = heading?.id ?? `section-${headingIndex}`;
      return `<h${safeDepth} id="${escapeAttribute(id)}">${this.parser.parseInline(tokens)}</h${safeDepth}>\n`;
    },
    link({ href, title, tokens }) {
      const rewrittenHref = rewritePublicationHref(href, headingTargets);
      const titleAttribute = title
        ? ` title="${escapeAttribute(title)}"`
        : "";
      return `<a href="${escapeAttribute(rewrittenHref)}"${titleAttribute}>${this.parser.parseInline(tokens)}</a>`;
    },
  };
};

export function renderPublicationMarkdown(
  markdown: string,
  options: PublicationMarkdownOptions = {},
): string {
  const source = options.stripLeadingH1
    ? sourceWithoutLeadingH1(markdown)
    : markdown;
  const headings = collectPublicationHeadings(
    source,
    options.headingCounts ?? new Map<string, number>(),
  );
  const renderer = publicationRenderer(
    headings,
    options.headingTargets ?? new Map<string, string>(),
  );
  return String(new Marked({ renderer }).parse(source));
}
