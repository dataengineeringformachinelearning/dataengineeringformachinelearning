/**
 * Bridge for Algolia Experiences autocomplete (#autocomplete).
 * Loads the Experiences script from config and keeps book sidebar search + ⌘K working.
 */
function loadAlgoliaExperiences() {
  if (document.querySelector("script[data-deml-algolia-experiences]")) {
    return;
  }
  const cfg = window.ALGOLIA_CONFIG || {};
  const appId = cfg.appId || "ZJAFYOSH2V";
  const apiKey = cfg.apiKey || ""; // pragma: allowlist secret
  const experienceId = cfg.experienceId || appId;
  const env = cfg.env || "prod";
  if (!apiKey) {
    return;
  }
  const url = new URL(
    "https://cdn.jsdelivr.net/npm/@algolia/experiences/dist/experiences.js",
  );
  url.searchParams.set("appId", appId);
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("experienceId", experienceId);
  url.searchParams.set("env", env);
  const script = document.createElement("script");
  script.src = url.toString();
  script.defer = true;
  script.setAttribute("data-deml-algolia-experiences", "true");
  document.head.appendChild(script);
}

function focusAlgoliaSearch() {
  const host = document.getElementById("autocomplete");
  if (!host) return;
  host.classList.add("algolia-autocomplete-open");
  const input = host.querySelector("input, textarea, [contenteditable='true']");
  if (input && typeof input.focus === "function") {
    input.focus();
    if (typeof input.select === "function") input.select();
  }
}

document.addEventListener("click", (event) => {
  const host = document.getElementById("autocomplete");
  if (!host || !host.classList.contains("algolia-autocomplete-open")) return;
  if (window.matchMedia("(min-width: 768px)").matches) return;
  if (host.contains(event.target)) return;
  host.classList.remove("algolia-autocomplete-open");
});

window.DemlWidgets = window.DemlWidgets || {};
window.DemlWidgets.openSearch = focusAlgoliaSearch;

window.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    focusAlgoliaSearch();
  }
});

loadAlgoliaExperiences();
