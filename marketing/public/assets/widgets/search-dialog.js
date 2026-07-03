import { create, insert, search } from 'https://cdn.jsdelivr.net/npm/@orama/orama@2.0.17/+esm';

const css = `
.deml-search-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 10000;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 10vh;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s, visibility 0.2s;
  font-family: inherit;
}
.deml-search-overlay.open {
  opacity: 1;
  visibility: visible;
}
.deml-search-dialog {
  display: flex;
  flex-direction: column;
  background: color-mix(in srgb, var(--color-surface, #1e1e1e) 85%, transparent);
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--border-radius-md, 12px);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), var(--shadow-glow, 0 0 0 transparent);
  overflow: hidden;
  max-width: 600px;
  width: 90%;
  color: var(--color-on-surface, #fff);
  transform: scale(0.95);
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.deml-search-overlay.open .deml-search-dialog {
  transform: scale(1);
}
.deml-search-input-wrapper {
  display: flex;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  gap: 8px;
  background: rgba(0, 0, 0, 0.2);
}
.deml-search-input-wrapper:focus-within {
  border-bottom-color: var(--crayola-blue, #2176ff);
}
.deml-search-icon {
  color: var(--crayola-blue, #2176ff);
  font-size: 24px;
}
.deml-search-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  font-size: 1.1rem;
  color: var(--text-color, #fff);
  font-family: inherit;
}
.deml-search-input::placeholder {
  color: var(--text-muted, #999);
  opacity: 0.7;
}
.deml-search-close-btn {
  background: none;
  border: none;
  color: var(--text-muted, #999);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.deml-search-close-btn:hover {
  color: var(--crayola-blue, #2176ff);
}
.deml-search-body {
  max-height: 384px;
  overflow-y: auto;
  padding: 16px;
}
.deml-search-body::-webkit-scrollbar { width: 8px; }
.deml-search-body::-webkit-scrollbar-track { background: transparent; }
.deml-search-body::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 4px; }

.deml-results-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.deml-search-result-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  border-radius: var(--border-radius-sm, 6px);
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid transparent;
  cursor: pointer;
  gap: 8px;
}
.deml-search-result-item.selected,
.deml-search-result-item:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(33, 118, 255, 0.3);
  box-shadow: 0 0 10px rgba(33, 118, 255, 0.1);
}
.deml-search-result-item.selected .deml-result-icon,
.deml-search-result-item:hover .deml-result-icon {
  color: var(--crayola-blue, #2176ff);
}
.deml-result-icon {
  color: var(--text-muted, #999);
  font-size: 20px;
}
.deml-result-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: hidden;
}
.deml-result-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-color, #fff);
}
.deml-result-snippet {
  font-size: 0.9rem;
  color: var(--text-muted, #999);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.status-badge-premium {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 16px;
  font-weight: 600;
  font-size: 0.85rem;
  letter-spacing: 0.03em;
  text-transform: capitalize;
  border: 1px solid transparent;
  white-space: nowrap;
}
.status-badge-premium.neutral {
  background: color-mix(in srgb, var(--color-info, #2176ff) 10%, transparent);
  color: var(--color-info, #2176ff);
  border-color: color-mix(in srgb, var(--color-info, #2176ff) 15%, transparent);
}
mark.deml-search-highlight {
  background: rgba(33, 118, 255, 0.2);
  color: var(--crayola-blue, #2176ff);
  font-weight: 600;
  padding: 0 2px;
}
.deml-no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  color: var(--text-muted, #999);
}
.deml-no-results p { margin: 0 0 8px; color: var(--text-color, #fff); }
.deml-no-results-icon {
  font-size: 40px;
  margin-bottom: 16px;
  opacity: 0.5;
}
.deml-search-footer {
  display: flex;
  padding: 8px 24px;
  background: rgba(0, 0, 0, 0.3);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  gap: 16px;
}
.deml-shortcut-tip {
  display: flex; align-items: center; gap: 8px; font-size: 0.9rem; color: var(--text-muted, #999);
}
.deml-shortcut-tip kbd {
  background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.15);
  padding: 2px 6px; font-weight: 600; color: var(--text-color, #fff); border-radius: 4px;
}
.deml-suggestions-container {
  padding: 16px 24px;
}
.deml-suggestions-header {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted, #999);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 12px;
}
.deml-suggestions-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.deml-suggestion-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  cursor: pointer;
  color: var(--text-color, #fff);
  transition: all 0.2s ease;
}
.deml-suggestion-item:hover, .deml-suggestion-item:focus {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  outline: none;
}
.deml-suggestion-item .material-icons {
  font-size: 20px;
  color: var(--text-muted, #999);
}
.deml-search-result-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 24px;
  cursor: pointer;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  text-decoration: none;
  color: inherit;
}
.deml-search-result-item:hover, .deml-search-result-item.selected {
  background: rgba(255, 255, 255, 0.05);
}
`;

let db = null;
let overlayEl = null;
let isInitializing = false;
let items = [];

async function initDb() {
  if (db || isInitializing) return;
  isInitializing = true;
  try {
    db = await create({
      schema: {
        id: 'string',
        title: 'string',
        content: 'string',
        type: 'string',
        url: 'string',
      },
    });

    const baseUrl = new URL(import.meta.url).origin;
    const res = await fetch(`${baseUrl}/assets/content/search-index.json`);
    if (res.ok) {
      items = await res.json();
      for (const item of items) {
        await insert(db, item);
      }
    }
  } catch (e) {
    console.error('Failed to initialize search DB', e);
  }
  isInitializing = false;
}

function renderSearch() {
  if (overlayEl) return;

  const styleEl = document.createElement('style');
  styleEl.innerHTML = css;
  document.head.appendChild(styleEl);

  overlayEl = document.createElement('div');
  overlayEl.className = 'deml-search-overlay';
  overlayEl.innerHTML = `
    <div class="deml-search-dialog">
      <div class="deml-search-input-wrapper">
        <span class="material-icons deml-search-icon">search</span>
        <input type="text" class="deml-search-input" id="deml-search-input" placeholder="Search documentation, components, status pages..." />
        <button class="deml-search-close-btn" id="deml-search-close"><span class="material-icons">close</span></button>
      </div>
      <div class="deml-search-body" id="deml-search-body">
        <div class="deml-no-results">
          <p>Type to start searching...</p>
        </div>
      </div>
      <div class="deml-search-footer">
        <div class="deml-shortcut-tip"><kbd>↑↓</kbd> <span>Navigate</span></div>
        <div class="deml-shortcut-tip"><kbd>↵</kbd> <span>Select</span></div>
        <div class="deml-shortcut-tip"><kbd>esc</kbd> <span>Close</span></div>
      </div>
    </div>
  `;

  document.body.appendChild(overlayEl);

  const inputEl = overlayEl.querySelector('#deml-search-input');
  const bodyEl = overlayEl.querySelector('#deml-search-body');
  const closeBtn = overlayEl.querySelector('#deml-search-close');

  let selectedIndex = 0;
  let currentResults = [];

  const updateResultsUI = () => {
    if (currentResults.length === 0 && inputEl.value.trim() !== '') {
      bodyEl.innerHTML = `
        <div class="deml-no-results">
          <span class="material-icons deml-no-results-icon">search_off</span>
          <p>No results found for "<strong>${inputEl.value}</strong>"</p>
        </div>`;
      return;
    }
    if (inputEl.value.trim() === '') {
      bodyEl.innerHTML = `
        <div class="deml-suggestions-container">
          <div class="deml-suggestions-header">Quick Navigation</div>
          <div class="deml-suggestions-grid">
            <div class="deml-suggestion-item" data-term="SLA">
              <span class="material-icons">speed</span>
              <span>SLA Monitoring</span>
            </div>
            <div class="deml-suggestion-item" data-term="neural">
              <span class="material-icons">psychology</span>
              <span>Neural Networks</span>
            </div>
            <div class="deml-suggestion-item" data-term="kafka">
              <span class="material-icons">lan</span>
              <span>Kafka Streams</span>
            </div>
            <div class="deml-suggestion-item" data-term="vulnerabilities">
              <span class="material-icons">security</span>
              <span>Security Reports</span>
            </div>
          </div>
        </div>
      `;

      bodyEl.querySelectorAll('.deml-suggestion-item').forEach(item => {
        item.addEventListener('click', e => {
          inputEl.value = e.currentTarget.getAttribute('data-term');
          inputEl.dispatchEvent(new Event('input'));
        });
      });
      return;
    }

    let html = '<div class="deml-results-container">';
    currentResults.forEach((res, i) => {
      const isSelected = i === selectedIndex ? 'selected' : '';
      const icon = res.type === 'chapter' ? 'menu_book' : 'dns';
      const badge = res.type === 'chapter' ? 'Doc' : 'Status';

      html += `
        <a href="${res.url}" class="deml-search-result-item ${isSelected}" data-index="${i}">
          <span class="material-icons deml-result-icon">${icon}</span>
          <div class="deml-result-content">
            <div class="deml-result-title">${res.title}</div>
            <div class="deml-result-snippet">${res.content.substring(0, 80)}...</div>
          </div>
          <span class="status-badge-premium neutral">${badge}</span>
        </a>
      `;
    });
    html += '</div>';
    bodyEl.innerHTML = html;

    const items = bodyEl.querySelectorAll('.deml-search-result-item');
    items.forEach(item => {
      item.addEventListener('mouseenter', e => {
        selectedIndex = parseInt(e.currentTarget.getAttribute('data-index'));
        updateResultsUI();
      });
      item.addEventListener('click', () => {
        const res = currentResults[selectedIndex];
        if (res.type === 'chapter') {
          // Astro site book page structure, navigate to book#chapter-X or select in UI
          // For now, if we are on /book, we can trigger the UI update by finding the sidebar item
          if (window.location.pathname.includes('/book')) {
            const pageItem = document.querySelector(
              `.page-item[data-index="${res.id.replace('chapter-', '')}"]`,
            );
            if (pageItem) pageItem.click();
          } else {
            window.location.href = res.url;
          }
          closeSearch();
        }
      });
    });
  };

  inputEl.addEventListener('input', async e => {
    const val = e.target.value;
    if (!val.trim() || !db) {
      currentResults = [];
      updateResultsUI();
      return;
    }
    const res = await search(db, {
      term: val,
      properties: ['title', 'content'],
      threshold: 0.1,
      tolerance: 2,
    });
    currentResults = res.hits.map(h => h.document);
    selectedIndex = 0;
    updateResultsUI();
  });

  inputEl.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, currentResults.length - 1);
      updateResultsUI();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
      updateResultsUI();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (currentResults[selectedIndex]) {
        const res = currentResults[selectedIndex];
        if (window.location.pathname.includes('/book')) {
          const pageItem = document.querySelector(
            `.page-item[data-index="${res.id.replace('chapter-', '')}"]`,
          );
          if (pageItem) pageItem.click();
        } else {
          window.location.href = res.url;
        }
        closeSearch();
      }
    } else if (e.key === 'Escape') {
      closeSearch();
    }
  });

  closeBtn.addEventListener('click', closeSearch);
  overlayEl.addEventListener('click', e => {
    if (e.target === overlayEl) closeSearch();
  });
}

function openSearch() {
  if (!db) initDb(); // Async lazy load
  if (!overlayEl) renderSearch();

  overlayEl.classList.add('open');
  const inputEl = overlayEl.querySelector('#deml-search-input');
  if (inputEl) {
    inputEl.value = '';
    // trigger empty input UI
    inputEl.dispatchEvent(new Event('input'));
    setTimeout(() => inputEl.focus(), 100);
  }
}

function closeSearch() {
  if (overlayEl) {
    overlayEl.classList.remove('open');
  }
}

window.DemlWidgets = window.DemlWidgets || {};
window.DemlWidgets.openSearch = openSearch;

// Init DB in background
setTimeout(initDb, 2000);

// Global hotkey
window.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    openSearch();
  }
});
