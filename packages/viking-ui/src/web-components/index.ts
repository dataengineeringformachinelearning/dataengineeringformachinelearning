export * from "../web/index";

import { registerVikingElements } from "../web/index";

// Auto-register only for the standalone script bundles (Astro, Django, static HTML).
if (typeof globalThis !== "undefined" && typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", registerVikingElements);
  } else {
    registerVikingElements();
  }
}
