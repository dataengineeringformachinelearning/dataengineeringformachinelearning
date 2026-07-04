import { attachShadowStyles } from '../core/base';
import { defineCustomElement } from '../core/dom';

const VIKING_THEME_TOGGLE_STYLES = `
:host {
  display: inline-flex;
}

.theme-toggle-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: var(--viking-control-height, 40px);
  height: var(--viking-control-height, 40px);
  min-width: var(--viking-control-height, 40px);
  padding: 0;
  border: 1px solid var(--viking-border-strong, var(--viking-border));
  border-radius: var(--viking-radius);
  background: var(--viking-surface);
  color: var(--viking-text);
  box-shadow: var(--viking-shadow-sm);
  cursor: pointer;
  transition: var(--viking-transition-interactive);
  -webkit-tap-highlight-color: transparent;
}

.theme-toggle-btn:hover {
  border-color: var(--viking-accent-strong, var(--viking-teal-400));
  background: var(--viking-surface-alt);
  color: var(--viking-accent-strong, var(--viking-teal-400));
  box-shadow: var(--viking-shadow-md);
}

.theme-toggle-btn:focus-visible {
  outline: var(--viking-ring-width, 2px) solid var(--viking-ring);
  outline-offset: var(--viking-ring-offset, 2px);
}

.theme-toggle-btn:active {
  transform: scale(var(--viking-state-active-scale, 0.98));
}

.theme-icon {
  display: none;
}

.theme-icon.is-visible {
  display: block;
}
`;

const applyTheme = (theme: 'light' | 'dark'): void => {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.classList.toggle('dark', theme === 'dark');
  localStorage.setItem('theme', theme);
};

const readTheme = (): 'light' | 'dark' => {
  const saved = localStorage.getItem('theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

/**
 * Framework-agnostic theme toggle Web Component.
 * Tag: `viking-theme-toggle-wc`
 */
export class VikingThemeToggleWc extends HTMLElement {
  static readonly tag = 'viking-theme-toggle-wc';

  private readonly shadow: ShadowRoot;
  private button: HTMLButtonElement | null = null;
  private sunIcon: SVGElement | null = null;
  private moonIcon: SVGElement | null = null;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    attachShadowStyles(this.shadow, VIKING_THEME_TOGGLE_STYLES);
  }

  connectedCallback(): void {
    this.render();
    this.syncIcons();
    this.button?.addEventListener('click', this.onClick);
  }

  disconnectedCallback(): void {
    this.button?.removeEventListener('click', this.onClick);
  }

  private readonly onClick = (): void => {
    const next = readTheme() === 'light' ? 'dark' : 'light';
    applyTheme(next);
    this.syncIcons();
    this.dispatchEvent(
      new CustomEvent('viking-theme-change', {
        bubbles: true,
        composed: true,
        detail: { theme: next },
      }),
    );
  };

  private syncIcons = (): void => {
    const isLight = readTheme() === 'light';
    this.sunIcon?.classList.toggle('is-visible', isLight);
    this.moonIcon?.classList.toggle('is-visible', !isLight);
  };

  private render(): void {
    const label = this.getAttribute('aria-label') ?? 'Toggle light and dark theme';
    this.shadow.innerHTML = `
      <button type="button" class="theme-toggle-btn" part="control" aria-label="${label}">
        <svg class="theme-icon theme-icon-sun" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/>
          <path stroke="currentColor" stroke-width="2" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
        </svg>
        <svg class="theme-icon theme-icon-moon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
        </svg>
      </button>
    `;
    this.button = this.shadow.querySelector('button');
    this.sunIcon = this.shadow.querySelector('.theme-icon-sun');
    this.moonIcon = this.shadow.querySelector('.theme-icon-moon');
  }
}

export const registerVikingThemeToggleWc = (): void => {
  defineCustomElement(VikingThemeToggleWc.tag, VikingThemeToggleWc);
};
