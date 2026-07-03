/**
 * Bridge for Algolia Experiences autocomplete (#autocomplete).
 * Waits for the navbar host (including Angular SSR hydration) before loading Experiences.
 */
const loadAlgoliaExperiences = () => {
  if (document.querySelector('script[data-deml-algolia-experiences]')) {
    return;
  }
  const cfg = window.ALGOLIA_CONFIG || {};
  const appId = cfg.appId || 'ZJAFYOSH2V';
  const apiKey = cfg.apiKey || ''; // pragma: allowlist secret
  const experienceId = cfg.experienceId || appId;
  const env = cfg.env || 'prod';
  if (!apiKey) {
    return;
  }
  const url = new URL('https://cdn.jsdelivr.net/npm/@algolia/experiences/dist/experiences.js');
  url.searchParams.set('appId', appId);
  url.searchParams.set('apiKey', apiKey);
  url.searchParams.set('experienceId', experienceId);
  url.searchParams.set('env', env);
  const script = document.createElement('script');
  script.src = url.toString();
  script.defer = true;
  script.setAttribute('data-deml-algolia-experiences', 'true');
  document.head.appendChild(script);
};

const isMobileSearch = () => window.matchMedia('(max-width: 767px)').matches;

const setSearchActive = active => {
  const root = document.querySelector('.navbar-search');
  if (root) root.classList.toggle('algolia-search-active', active);
  document.body.classList.toggle('algolia-search-backdrop', active && isMobileSearch());
};

const focusAlgoliaSearch = () => {
  const host = document.getElementById('autocomplete');
  if (!host) return;
  host.classList.add('algolia-autocomplete-open');
  setSearchActive(true);
  const input = host.querySelector("input, textarea, [contenteditable='true']");
  if (input && typeof input.focus === 'function') {
    input.focus();
    if (typeof input.select === 'function') input.select();
  }
};

const mountAlgoliaWhenReady = () => {
  const host = document.getElementById('autocomplete');
  if (!host) {
    return false;
  }
  loadAlgoliaExperiences();
  return true;
};

const watchForAutocompleteHost = () => {
  if (mountAlgoliaWhenReady()) {
    return;
  }

  const observer = new MutationObserver(() => {
    if (mountAlgoliaWhenReady()) {
      observer.disconnect();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  window.setTimeout(() => {
    observer.disconnect();
    mountAlgoliaWhenReady();
  }, 15000);
};

const closeMobileSearch = () => {
  const host = document.getElementById('autocomplete');
  if (!host) return;
  host.classList.remove('algolia-autocomplete-open');
  setSearchActive(false);
};

document.addEventListener('click', event => {
  const host = document.getElementById('autocomplete');
  if (!host || !host.classList.contains('algolia-autocomplete-open')) return;
  if (!isMobileSearch()) return;
  if (host.contains(event.target)) return;
  closeMobileSearch();
});

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  const host = document.getElementById('autocomplete');
  if (!host?.classList.contains('algolia-autocomplete-open')) return;
  closeMobileSearch();
});

window.DemlWidgets = window.DemlWidgets || {};
window.DemlWidgets.openSearch = focusAlgoliaSearch;

window.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    focusAlgoliaSearch();
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', watchForAutocompleteHost);
} else {
  watchForAutocompleteHost();
}
