import { attachShadowStyles, readBoolAttr } from '../core/base';

const VIKING_SEARCH_PALETTE_STYLES = `
:host {
  display: contents;
}

.viking-search-palette-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--viking-z-overlay, 10001);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 10vh var(--viking-space-2) var(--viking-space-2);
  background: var(--viking-overlay-backdrop, rgba(0, 0, 0, 0.55));
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  border: none;
  animation: viking-backdrop-in var(--viking-duration-fast) var(--viking-ease-out);
}

.viking-search-palette {
  display: flex;
  flex-direction: column;
  background: var(--viking-surface);
  border: 1px solid var(--viking-border-strong);
  border-radius: var(--viking-radius-lg);
  box-shadow: var(--viking-shadow-lg);
  overflow: hidden;
  max-width: 600px;
  width: 100%;
  margin: 0 auto;
  font-family: var(--viking-font-family);
  color: var(--viking-text);
  animation: viking-modal-in var(--viking-duration) var(--viking-ease-default);
  position: relative;
}

.viking-search-palette::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--viking-metallic-200) 22%, transparent),
    transparent
  );
  pointer-events: none;
  z-index: 1;
}

.viking-search-palette-header {
  display: flex;
  align-items: center;
  padding: var(--viking-space-2);
  border-bottom: 1px solid var(--viking-border);
  gap: var(--viking-space-1);
  background: color-mix(in srgb, var(--viking-bg) 20%, transparent);
}

.viking-search-palette-header:focus-within {
  border-bottom-color: var(--viking-accent);
  box-shadow: inset 0 -2px 0 var(--viking-accent-soft);
}

.viking-search-palette-icon {
  color: var(--viking-text-muted);
  font-size: var(--viking-font-size-lg);
  line-height: 1;
  flex-shrink: 0;
}

.viking-search-palette-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  font-size: calc(var(--viking-font-size) * 1.05);
  color: var(--viking-text);
  font-family: inherit;
  min-width: 0;
}

.viking-search-palette-input::placeholder {
  color: var(--viking-text-muted);
}

.viking-search-palette-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: var(--viking-touch-target-comfort, 44px);
  min-height: var(--viking-touch-target-comfort, 44px);
  border: none;
  background: transparent;
  color: var(--viking-text-muted);
  cursor: pointer;
  padding: var(--viking-space-half);
  border-radius: var(--viking-radius);
  font-size: var(--viking-font-size-lg);
  line-height: 1;
}

.viking-search-palette-close:hover {
  color: var(--viking-text);
  background: var(--viking-accent-soft);
}

.viking-search-palette-close:focus-visible {
  outline: var(--viking-ring-width) solid var(--viking-ring);
  outline-offset: var(--viking-ring-offset);
}

.viking-search-palette-body {
  max-height: 50vh;
  overflow-y: auto;
  padding: var(--viking-space-2);
}

.viking-search-palette-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--viking-space-1);
  padding: var(--viking-space-1) var(--viking-space-2);
  border-top: 1px solid var(--viking-border);
  font-size: calc(var(--viking-font-size) * 0.85);
  color: var(--viking-text-muted);
}

.viking-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  padding: 2px 6px;
  font-family: inherit;
  font-size: calc(var(--viking-font-size) * 0.75);
  border-radius: calc(var(--viking-radius) / 2);
  border: 1px solid var(--viking-border);
  background: var(--viking-surface-alt);
}

.viking-search-results {
  display: flex;
  flex-direction: column;
  gap: var(--viking-space-1);
}

.viking-search-result {
  display: flex;
  align-items: center;
  min-height: var(--viking-control-height-sm, 36px);
  padding: var(--viking-space-1) var(--viking-space-2);
  border-radius: var(--viking-radius);
  background: color-mix(in srgb, var(--viking-surface) 2%, transparent);
  border: 1px solid transparent;
  cursor: pointer;
  transition: var(--viking-transition-interactive);
  gap: var(--viking-space-1);
  text-decoration: none;
  color: inherit;
}

.viking-search-result:hover,
.viking-search-result.is-selected {
  background: color-mix(in srgb, var(--viking-accent) 5%, transparent);
  border-color: color-mix(in srgb, var(--viking-accent) 30%, transparent);
  box-shadow: var(--viking-shadow-sm);
}

.viking-search-result:focus-visible {
  outline: var(--viking-ring-width) solid var(--viking-ring);
  outline-offset: var(--viking-ring-offset);
}

.viking-search-result-title {
  font-size: var(--viking-font-size-sm);
  font-weight: var(--viking-font-weight-semibold);
  color: var(--viking-text);
}

.viking-search-result-snippet {
  font-size: var(--viking-font-size-xs);
  color: var(--viking-text-muted);
}

.viking-search-empty {
  padding: var(--viking-space-3);
  text-align: center;
  color: var(--viking-text-muted);
  font-size: var(--viking-font-size-sm);
}

@keyframes viking-backdrop-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes viking-modal-in {
  from {
    opacity: 0;
    transform: translateY(var(--viking-space-1)) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
`;

const modKey = (): string =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform) ? '⌘' : 'Ctrl';

type SearchItem = { title: string; href: string; snippet?: string };

const parseItems = (el: HTMLElement): SearchItem[] => {
  const raw = el.getAttribute('items');
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SearchItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/**
 * Framework-agnostic command palette / search overlay Web Component.
 * Tag: `viking-search-palette-wc`
 *
 * @example
 * <viking-search-palette-wc global-shortcut items='[{"title":"Components","href":"/components"}]'></viking-search-palette-wc>
 */
export class VikingSearchPaletteWc extends HTMLElement {
  static readonly tag = 'viking-search-palette-wc';

  static get observedAttributes(): string[] {
    return ['open', 'placeholder', 'items'];
  }

  private readonly shadow: ShadowRoot;
  private dialogEl: HTMLDialogElement | null = null;
  private inputEl: HTMLInputElement | null = null;
  private resultsEl: HTMLDivElement | null = null;
  private globalKeyHandler: ((event: KeyboardEvent) => void) | null = null;
  private query = '';

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    attachShadowStyles(this.shadow, VIKING_SEARCH_PALETTE_STYLES);
  }

  connectedCallback(): void {
    this.render();
    this.syncOpen();
    this.bindGlobalShortcut();
    this.dialogEl?.addEventListener('close', this.onClose);
    this.dialogEl?.addEventListener('click', this.onBackdropClick);
    this.inputEl?.addEventListener('input', this.onInput);
  }

  disconnectedCallback(): void {
    this.dialogEl?.removeEventListener('close', this.onClose);
    this.dialogEl?.removeEventListener('click', this.onBackdropClick);
    this.inputEl?.removeEventListener('input', this.onInput);
    this.unbindGlobalShortcut();
  }

  attributeChangedCallback(name: string): void {
    if (!this.isConnected) return;
    if (name === 'open') {
      this.syncOpen();
    }
    if (name === 'items' || name === 'placeholder') {
      this.renderResults();
    }
  }

  openPalette(): void {
    this.setAttribute('open', '');
    this.syncOpen();
  }

  closePalette(): void {
    this.removeAttribute('open');
    this.dialogEl?.close();
  }

  private readonly onClose = (): void => {
    this.removeAttribute('open');
    this.query = '';
    if (this.inputEl) this.inputEl.value = '';
    this.dispatchEvent(
      new CustomEvent('viking-close', { bubbles: true, composed: true }),
    );
  };

  private readonly onBackdropClick = (event: MouseEvent): void => {
    if (event.target === this.dialogEl) {
      this.closePalette();
    }
  };

  private readonly onInput = (event: Event): void => {
    this.query = (event.target as HTMLInputElement).value;
    this.renderResults();
    this.dispatchEvent(
      new CustomEvent('viking-query', {
        bubbles: true,
        composed: true,
        detail: { query: this.query },
      }),
    );
  };

  private bindGlobalShortcut(): void {
    if (!readBoolAttr(this, 'global-shortcut')) return;
    this.globalKeyHandler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        this.openPalette();
      }
    };
    document.addEventListener('keydown', this.globalKeyHandler);
  }

  private unbindGlobalShortcut(): void {
    if (this.globalKeyHandler) {
      document.removeEventListener('keydown', this.globalKeyHandler);
      this.globalKeyHandler = null;
    }
  }

  private syncOpen(): void {
    if (!this.dialogEl) return;
    const shouldOpen = this.hasAttribute('open');
    if (shouldOpen && !this.dialogEl.open) {
      this.dialogEl.showModal();
      this.renderResults();
      queueMicrotask(() => this.inputEl?.focus());
    } else if (!shouldOpen && this.dialogEl.open) {
      this.dialogEl.close();
    }
  }

  private renderResults(): void {
    if (!this.resultsEl) return;
    const items = parseItems(this);
    const q = this.query.trim().toLowerCase();
    const filtered = q
      ? items.filter(
          (item) =>
            item.title.toLowerCase().includes(q) ||
            (item.snippet?.toLowerCase().includes(q) ?? false),
        )
      : items;

    if (filtered.length === 0) {
      this.resultsEl.innerHTML = `<p class="viking-search-empty">${q ? 'No results found' : 'Start typing to search…'}</p>`;
      return;
    }

    this.resultsEl.innerHTML = `<div class="viking-search-results" role="listbox">${filtered
      .map(
        (item) => `
        <a class="viking-search-result" role="option" href="${item.href}" part="result">
          <div>
            <div class="viking-search-result-title">${item.title}</div>
            ${item.snippet ? `<div class="viking-search-result-snippet">${item.snippet}</div>` : ''}
          </div>
        </a>`,
      )
      .join('')}</div>`;
  }

  private render(): void {
    const placeholder =
      this.getAttribute('placeholder') ?? 'Search documentation, dashboard, API…';
    const mod = modKey();

    this.shadow.innerHTML = `
      <dialog class="viking-search-palette-backdrop" aria-label="Search">
        <div class="viking-search-palette" part="panel" role="dialog" aria-modal="true">
          <div class="viking-search-palette-header" part="header">
            <span class="viking-search-palette-icon" aria-hidden="true">⌕</span>
            <input
              type="search"
              class="viking-search-palette-input"
              part="input"
              placeholder="${placeholder}"
              aria-label="${placeholder}"
              autocomplete="off"
              spellcheck="false"
            />
            <button type="button" class="viking-search-palette-close" part="close" aria-label="Close search">✕</button>
          </div>
          <div class="viking-search-palette-body" part="body">
            <slot></slot>
            <div class="viking-search-results-host"></div>
          </div>
          <footer class="viking-search-palette-footer" part="footer">
            <span class="viking-kbd">${mod}</span><span class="viking-kbd">K</span> toggle ·
            <span class="viking-kbd">Esc</span> close
          </footer>
        </div>
      </dialog>
    `;

    this.dialogEl = this.shadow.querySelector('dialog');
    this.inputEl = this.shadow.querySelector('input');
    this.resultsEl = this.shadow.querySelector('.viking-search-results-host');

    const closeBtn = this.shadow.querySelector('.viking-search-palette-close');
    closeBtn?.addEventListener('click', () => this.closePalette());

    this.dialogEl?.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.closePalette();
      }
    });
  }
}

export const registerVikingSearchPaletteWc = (): void => {
  if (!customElements.get(VikingSearchPaletteWc.tag)) {
    customElements.define(VikingSearchPaletteWc.tag, VikingSearchPaletteWc);
  }
};
