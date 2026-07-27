import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "parse5";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.join(dirname, "..");
const distDir = path.join(projectDir, "dist");
const siteOrigin = "https://dataengineeringformachinelearning.com";

const errors = [];
const pages = [];
const htmlFiles = [];

const walkFiles = directory => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walkFiles(target);
    } else if (entry.name.endsWith(".html")) {
      htmlFiles.push(target);
    }
  }
};

const attributes = node =>
  Object.fromEntries((node.attrs ?? []).map(attribute => [attribute.name, attribute.value]));

const textContent = node =>
  (node.childNodes ?? [])
    .map(child => (child.nodeName === "#text" ? child.value : textContent(child)))
    .join("");

const routeForFile = file => {
  const relative = path.relative(distDir, file).split(path.sep).join("/");
  if (relative === "index.html") return "/";
  if (relative.endsWith("/index.html")) {
    return `/${relative.slice(0, -"/index.html".length)}/`;
  }
  return `/${relative}`;
};

const outputForPath = pathname => {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  const safePath = decoded.replace(/^\/+/, "");
  const candidates = [
    path.join(distDir, safePath, "index.html"),
    path.join(distDir, `${safePath}.html`),
    path.join(distDir, safePath),
  ];
  if (decoded === "/") candidates.unshift(path.join(distDir, "index.html"));
  if (decoded === "/404/") candidates.unshift(path.join(distDir, "404.html"));
  return (
    candidates.find(
      candidate =>
        fs.existsSync(candidate) && fs.statSync(candidate).isFile(),
    ) ?? null
  );
};

const vercelConfig = JSON.parse(
  fs.readFileSync(path.join(projectDir, "vercel.json"), "utf8"),
);
const redirectPatterns = (vercelConfig.redirects ?? []).map(redirect => {
  const pattern = redirect.source
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/:[^/]+/g, "[^/]+");
  return new RegExp(`^${pattern}/?$`);
});
const isRedirectPath = pathname =>
  redirectPatterns.some(pattern => pattern.test(pathname));

const describe = (file, message) =>
  `${path.relative(projectDir, file).split(path.sep).join("/")}: ${message}`;

if (!fs.existsSync(distDir)) {
  console.error("verify-build: dist is missing; run the Astro build first");
  process.exit(1);
}

walkFiles(distDir);

for (const file of htmlFiles.sort()) {
  const html = fs.readFileSync(file, "utf8");
  const document = parse(html);
  const route = routeForFile(file);
  const ids = new Map();
  const references = [];
  const links = [];
  const labels = [];
  const controls = [];
  let mainCount = 0;
  let h1Count = 0;
  let titleCount = 0;
  let descriptionCount = 0;
  let canonicalCount = 0;

  const visit = node => {
    const attrs = attributes(node);
    const tag = node.tagName;

    if (attrs.id) {
      const count = (ids.get(attrs.id) ?? 0) + 1;
      ids.set(attrs.id, count);
      if (count > 1) {
        errors.push(describe(file, `duplicate id="${attrs.id}"`));
      }
    }

    if (tag === "main") mainCount += 1;
    if (tag === "h1") h1Count += 1;
    if (tag === "title") titleCount += 1;
    if (tag === "meta" && attrs.name === "description" && attrs.content) {
      descriptionCount += 1;
    }
    if (tag === "link" && attrs.rel === "canonical" && attrs.href) {
      canonicalCount += 1;
    }

    for (const name of ["aria-labelledby", "aria-describedby", "aria-controls"]) {
      if (attrs[name]) {
        references.push(...attrs[name].split(/\s+/).map(id => ({ id, name })));
      }
    }

    if (tag === "label" && attrs.for) labels.push(attrs.for);
    if (["input", "select", "textarea"].includes(tag)) {
      controls.push({ tag, attrs });
    }

    if (
      ["viking-button-wc", "viking-theme-toggle-wc"].includes(tag) &&
      attrs.role === "button"
    ) {
      errors.push(
        describe(
          file,
          `<${tag}> must not declare role="button" because it renders a native control`,
        ),
      );
    }

    if (tag === "button" || tag === "viking-button-wc" || tag === "viking-theme-toggle-wc") {
      const hasName =
        Boolean(attrs["aria-label"]?.trim()) || Boolean(textContent(node).trim());
      if (!hasName) {
        errors.push(describe(file, `<${tag}> has no accessible name`));
      }
    }

    if (tag === "a" && attrs.target === "_blank") {
      const rel = new Set((attrs.rel ?? "").split(/\s+/));
      if (!rel.has("noopener") || !rel.has("noreferrer")) {
        errors.push(
          describe(file, `target="_blank" link is missing rel="noopener noreferrer"`),
        );
      }
    }

    for (const attributeName of ["href", "src"]) {
      const value = attrs[attributeName];
      if (value) links.push({ attributeName, value });
    }

    for (const child of node.childNodes ?? []) visit(child);
  };

  visit(document);

  if (mainCount !== 1) {
    errors.push(describe(file, `expected exactly one <main>, found ${mainCount}`));
  }
  if (ids.get("main-content") !== 1) {
    errors.push(
      describe(file, `expected exactly one id="main-content", found ${ids.get("main-content") ?? 0}`),
    );
  }
  if (h1Count !== 1) {
    errors.push(describe(file, `expected exactly one <h1>, found ${h1Count}`));
  }
  if (titleCount !== 1) {
    errors.push(describe(file, `expected exactly one <title>, found ${titleCount}`));
  }
  if (descriptionCount !== 1) {
    errors.push(
      describe(file, `expected one non-empty meta description, found ${descriptionCount}`),
    );
  }
  if (canonicalCount !== 1) {
    errors.push(describe(file, `expected exactly one canonical link, found ${canonicalCount}`));
  }

  for (const reference of references) {
    if (!ids.has(reference.id)) {
      errors.push(
        describe(file, `${reference.name} references missing id="${reference.id}"`),
      );
    }
  }
  for (const target of labels) {
    if (!ids.has(target)) {
      errors.push(describe(file, `<label for="${target}"> has no matching control`));
    }
  }
  for (const control of controls) {
    if (
      control.attrs.type !== "hidden" &&
      control.attrs.disabled === undefined &&
      !control.attrs.name &&
      control.attrs.id !== "vuln-bot-check"
    ) {
      errors.push(
        describe(
          file,
          `<${control.tag}${control.attrs.id ? ` id="${control.attrs.id}"` : ""}> is missing name`,
        ),
      );
    }
  }

  pages.push({ file, route, ids, links });
}

const pageByFile = new Map(pages.map(page => [path.resolve(page.file), page]));

for (const page of pages) {
  for (const link of page.links) {
    const raw = link.value.trim();
    if (
      !raw ||
      raw.startsWith("mailto:") ||
      raw.startsWith("tel:") ||
      raw.startsWith("data:") ||
      raw.startsWith("blob:") ||
      raw.startsWith("javascript:")
    ) {
      continue;
    }

    let url;
    try {
      url = new URL(raw, `${siteOrigin}${page.route}`);
    } catch {
      errors.push(describe(page.file, `invalid ${link.attributeName}="${raw}"`));
      continue;
    }
    if (url.origin !== siteOrigin) continue;

    const output = outputForPath(url.pathname);
    if (!output && !isRedirectPath(url.pathname)) {
      errors.push(
        describe(page.file, `local ${link.attributeName}="${raw}" has no build output or redirect`),
      );
      continue;
    }

    if (url.hash && output?.endsWith(".html")) {
      const targetPage = pageByFile.get(path.resolve(output));
      const fragment = decodeURIComponent(url.hash.slice(1));
      if (targetPage && fragment && !targetPage.ids.has(fragment)) {
        errors.push(
          describe(page.file, `${link.attributeName}="${raw}" targets missing fragment`),
        );
      }
    }
  }
}

if (errors.length > 0) {
  console.error(`verify-build: ${errors.length} issue(s) found`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `verify-build: ${pages.length} HTML pages passed structure, accessibility, and local-link checks`,
);
