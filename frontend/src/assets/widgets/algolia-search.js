/**
 * Bridge for Algolia Experiences autocomplete (#autocomplete).
 * Opens in a viking-search-palette modal on all breakpoints (trigger: navbar button or Cmd/Ctrl+K).
 */
if (window.__DEML_ALGOLIA_SEARCH_READY__ !== true) {
  window.__DEML_ALGOLIA_SEARCH_READY__ = true;

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

const getSearchPanel = host =>
  host?.querySelector(
    '.aa-Panel, .aa-Autocomplete, .aa-DetachedContainer, .aa-Form, form',
  ) ?? null;

const getDetachedSearchPanel = () =>
  document.querySelector('.aa-DetachedContainer');

const isSearchTarget = target => {
  if (!target) return false;
  const host = document.getElementById('autocomplete');
  if (!host) return false;
  const panel = getSearchPanel(host);
  const detached = getDetachedSearchPanel();
  return (
    host.contains(target) ||
    (panel && panel.contains(target)) ||
    (detached && detached.contains(target))
  );
};

const setSearchActive = active => {
  const root = document.querySelector('.navbar-search');
  if (root) root.classList.toggle('algolia-search-active', active);
  document.body.classList.toggle('algolia-search-open', active);
};

const focusAlgoliaSearch = () => {
  const host = document.getElementById('autocomplete');
  if (!host) return;
  loadAlgoliaExperiences();
  host.classList.add('algolia-autocomplete-open');
  host.setAttribute('aria-hidden', 'false');
  setSearchActive(true);
  const focusInput = () => {
    const input = host.querySelector("input, textarea, [contenteditable='true']");
    if (input && typeof input.focus === 'function') {
      input.focus();
      if (typeof input.select === 'function') input.select();
      return true;
    }
    return false;
  };
  if (!focusInput()) {
    window.setTimeout(focusInput, 100);
    window.setTimeout(focusInput, 350);
  }
};

const closeSearch = () => {
  const host = document.getElementById('autocomplete');
  if (!host) return;
  host.classList.remove('algolia-autocomplete-open');
  host.setAttribute('aria-hidden', 'true');
  setSearchActive(false);
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

document.addEventListener('pointerdown', event => {
  const host = document.getElementById('autocomplete');
  if (!host?.classList.contains('algolia-autocomplete-open')) return;
  if (isSearchTarget(event.target)) return;
  closeSearch();
});

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  const host = document.getElementById('autocomplete');
  if (!host?.classList.contains('algolia-autocomplete-open')) return;
  event.preventDefault();
  closeSearch();
});

window.DemlWidgets = window.DemlWidgets || {};
window.DemlWidgets.openSearch = focusAlgoliaSearch;
window.DemlWidgets.closeSearch = closeSearch;

window.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    const host = document.getElementById('autocomplete');
    if (host?.classList.contains('algolia-autocomplete-open')) {
      closeSearch();
      return;
    }
    focusAlgoliaSearch();
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', watchForAutocompleteHost);
} else {
  watchForAutocompleteHost();
}
}
