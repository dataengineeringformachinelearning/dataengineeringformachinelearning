import { attachShadowStyles } from '../core/base';

const VIKING_SELECT_STYLES = `
:host {
  display: block;
  font-family: var(--viking-font-family);
}

.viking-field {
  display: flex;
  flex-direction: column;
  gap: var(--viking-space-half);
}

.viking-field-label {
  font-size: var(--viking-font-size-xs);
  font-weight: var(--viking-font-weight-semibold);
  letter-spacing: var(--viking-letter-spacing-caps);
  text-transform: uppercase;
  color: var(--viking-text-muted);
}

.viking-select-native {
  width: 100%;
  min-height: var(--viking-control-height, 40px);
  padding: 0 var(--viking-space-2);
  border: 1px solid var(--viking-border);
  border-radius: var(--viking-radius);
  background: var(--viking-surface);
  color: var(--viking-text);
  font-family: inherit;
  font-size: var(--viking-font-size-sm);
  cursor: pointer;
}

.viking-select-native:focus-visible {
  outline: var(--viking-ring-width, 2px) solid var(--viking-ring);
  outline-offset: var(--viking-ring-offset, 2px);
}

.viking-select-native:disabled {
  opacity: var(--viking-state-disabled-opacity);
  cursor: not-allowed;
}
`;

/**
 * Framework-agnostic native select Web Component.
 * Tag: `viking-select-wc`
 *
 * Place <option> elements as light DOM children; they are cloned into the shadow select.
 */
export class VikingSelectWc extends HTMLElement {
  static readonly tag = 'viking-select-wc';

  static get observedAttributes(): string[] {
    return ['label', 'name', 'value', 'disabled', 'required'];
  }

  private readonly shadow: ShadowRoot;
  private selectEl: HTMLSelectElement | null = null;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    attachShadowStyles(this.shadow, VIKING_SELECT_STYLES);
  }

  connectedCallback(): void {
    this.render();
    this.syncOptions();
    this.selectEl?.addEventListener('change', this.onChange);
  }

  disconnectedCallback(): void {
    this.selectEl?.removeEventListener('change', this.onChange);
  }

  attributeChangedCallback(): void {
    if (this.isConnected) {
      this.render();
      this.syncOptions();
    }
  }

  private readonly onChange = (): void => {
    const value = this.selectEl?.value ?? '';
    this.setAttribute('value', value);
    this.dispatchEvent(
      new CustomEvent('viking-change', { bubbles: true, composed: true, detail: { value } }),
    );
  };

  private render(): void {
    const label = this.getAttribute('label') ?? '';
    const name = this.getAttribute('name') ?? '';
    const value = this.getAttribute('value') ?? '';
    const disabled = this.hasAttribute('disabled');
    const required = this.hasAttribute('required');
    const id = `viking-select-${Math.random().toString(36).slice(2, 9)}`;

    this.shadow.innerHTML = `
      <div class="viking-field" part="field">
        ${label ? `<label class="viking-field-label" part="label" for="${id}">${label}</label>` : ''}
        <select
          id="${id}"
          class="viking-select-native"
          part="control"
          ${name ? `name="${name}"` : ''}
          ${disabled ? 'disabled' : ''}
          ${required ? 'required' : ''}
        ></select>
      </div>
    `;

    this.selectEl = this.shadow.querySelector('select');
    if (this.selectEl && value) {
      this.selectEl.value = value;
    }
  }

  private syncOptions(): void {
    if (!this.selectEl) return;
    this.selectEl.innerHTML = '';
    const options = this.querySelectorAll('option');
    if (options.length === 0) {
      const placeholder = this.getAttribute('placeholder') ?? 'Select…';
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = placeholder;
      opt.disabled = true;
      opt.selected = true;
      this.selectEl.append(opt);
      return;
    }
    options.forEach((opt) => {
      this.selectEl?.append(opt.cloneNode(true));
    });
    const value = this.getAttribute('value');
    if (value) {
      this.selectEl.value = value;
    }
  }
}

export const registerVikingSelectWc = (): void => {
  if (!customElements.get(VikingSelectWc.tag)) {
    customElements.define(VikingSelectWc.tag, VikingSelectWc);
  }
};
