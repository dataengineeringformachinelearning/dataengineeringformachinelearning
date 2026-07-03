/**
 * Bridge for Algolia Experiences autocomplete (#autocomplete).
 * Keeps book sidebar search + ⌘K working after migrating off Orama.
 */
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
