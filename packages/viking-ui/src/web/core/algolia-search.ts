/**
 * Lightweight Algolia multi-index search for suite command palette.
 * Uses public search-only key from window.ALGOLIA_CONFIG — no SDK runtime.
 */

export type AlgoliaConfig = {
  appId?: string;
  apiKey?: string;
  indexNames?: string[];
  env?: string;
};

export type AlgoliaHitItem = {
  title: string;
  href: string;
  snippet?: string;
  group?: string;
  keywords?: string[];
};

const DEFAULT_INDEXES: readonly string[] = [
  "dataengineeringformachinelearning_com_zjafyosh2v_pages",
  "deml_app_pages",
  "deml_backend_pages",
  "DEML UI",
];

/** Map crawler index names → public origin when hits only store path. */
const INDEX_ORIGIN: Readonly<Record<string, string>> = {
  dataengineeringformachinelearning_com_zjafyosh2v_pages:
    "https://dataengineeringformachinelearning.com",
  deml_app_pages: "https://deml.app",
  deml_backend_pages: "https://backend.deml.app",
  "DEML UI": "https://ui.dataengineeringformachinelearning.com",
};

const readConfig = (): AlgoliaConfig => {
  if (typeof globalThis === "undefined") {
    return {};
  }
  return (
    (globalThis as { ALGOLIA_CONFIG?: AlgoliaConfig }).ALGOLIA_CONFIG ?? {}
  );
};

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value : null;

const asHttpUrl = (value: unknown): string | null => {
  const raw = asString(value);
  if (!raw) {
    return null;
  }
  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }
  return null;
};

const resolveHitUrl = (
  hit: Record<string, unknown>,
  indexName: string,
): string | null => {
  const objectId = asString(hit["objectID"]);
  const direct =
    asHttpUrl(hit["url"]) ||
    asHttpUrl(hit["url_without_anchor"]) ||
    asHttpUrl(hit["permalink"]) ||
    asHttpUrl(hit["link"]) ||
    asHttpUrl(objectId);
  if (direct) {
    return direct;
  }

  const path = asString(hit["path"]);
  if (!path) {
    return null;
  }

  const hostname = asString(hit["hostname"]);
  const origin =
    INDEX_ORIGIN[indexName] ||
    (hostname ? `https://${hostname.replace(/^https?:\/\//i, "")}` : null);
  if (!origin) {
    return null;
  }
  try {
    return new URL(path.startsWith("/") ? path : `/${path}`, origin).href;
  } catch {
    return null;
  }
};

const hitToItem = (
  hit: Record<string, unknown>,
  indexName: string,
): AlgoliaHitItem | null => {
  const url = resolveHitUrl(hit, indexName);
  if (!url) {
    return null;
  }

  const hierarchy = hit["hierarchy"] as Record<string, unknown> | undefined;
  const title =
    asString(hit["title"]) ||
    asString(hierarchy?.["lvl1"]) ||
    asString(hierarchy?.["lvl0"]) ||
    asString(hit["path"]) ||
    url;

  const description =
    asString(hit["description"]) ||
    (asString(hit["content"]) ?? "").slice(0, 160) ||
    asString(hierarchy?.["lvl2"]) ||
    "";

  let hostname = asString(hit["hostname"]);
  if (!hostname) {
    try {
      hostname = new URL(url).hostname;
    } catch {
      hostname = indexName;
    }
  }

  const keywordField = asString(hit["keywords"]);
  const path = asString(hit["path"]) ?? "";

  return {
    title: title.slice(0, 120),
    href: url,
    snippet: description
      ? `${hostname} · ${description.slice(0, 140)}`
      : hostname,
    group: "Live pages",
    keywords: [
      hostname,
      indexName,
      path,
      ...(keywordField ? keywordField.split(/[,\s]+/).filter(Boolean) : []),
    ].filter(Boolean) as string[],
  };
};

/**
 * Query all configured Algolia page indexes. Returns empty array when
 * config/key missing or network fails (callers fall back to curated items).
 */
export const searchAlgoliaPages = async (
  query: string,
  options?: { hitsPerPage?: number; signal?: AbortSignal },
): Promise<AlgoliaHitItem[]> => {
  const q = query.trim();
  if (!q || q.length < 2) {
    return [];
  }

  const cfg = readConfig();
  const appId = cfg.appId || "ZJAFYOSH2V";
  const apiKey = cfg.apiKey || "";
  if (!apiKey) {
    return [];
  }

  const indexes =
    cfg.indexNames && cfg.indexNames.length > 0
      ? cfg.indexNames
      : [...DEFAULT_INDEXES];
  const hitsPerPage = options?.hitsPerPage ?? 8;

  const endpoint = `https://${appId}-dsn.algolia.net/1/indexes/*/queries`;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Algolia-Application-Id": appId,
        "X-Algolia-API-Key": apiKey,
      },
      body: JSON.stringify({
        requests: indexes.map((indexName) => ({
          indexName,
          params: new URLSearchParams({
            query: q,
            hitsPerPage: String(hitsPerPage),
            attributesToRetrieve: [
              "url",
              "url_without_anchor",
              "permalink",
              "link",
              "title",
              "description",
              "content",
              "path",
              "hostname",
              "keywords",
              "hierarchy",
              "type",
              "objectID",
            ].join(","),
            attributesToHighlight: "[]",
          }).toString(),
        })),
      }),
      signal: options?.signal,
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as {
      results?: { hits?: Record<string, unknown>[]; index?: string }[];
    };

    const seen = new Set<string>();
    const items: AlgoliaHitItem[] = [];

    (payload.results ?? []).forEach((result, index) => {
      const indexName = result.index || indexes[index] || "pages";
      (result.hits ?? []).forEach((hit) => {
        const item = hitToItem(hit, indexName);
        if (!item || seen.has(item.href)) {
          return;
        }
        seen.add(item.href);
        items.push(item);
      });
    });

    return items;
  } catch {
    return [];
  }
};

export const ALGOLIA_DEFAULT_INDEXES = DEFAULT_INDEXES;
