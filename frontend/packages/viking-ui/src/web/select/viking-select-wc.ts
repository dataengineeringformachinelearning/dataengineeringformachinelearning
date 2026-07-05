import { attachShadowStyles, setFormValue } from '../core/base';
import { defineCustomElement, escapeHtml, vikingWcUid } from '../core/dom';
import { VIKING_SELECT_STYLES } from '../core/styles';

/**
 * Framework-agnostic native select Web Component with form association.
 * Tag: `viking-select-wc`
 *
 * Place `<option>` elements as light DOM children; they are mirrored into the shadow select.
 *
 * @attr label - Visible field label
 * @attr name - Form field name (participates in form submission via ElementInternals)
 * @attr value - Selected option value
 * @attr placeholder - Placeholder option text when no value is selected
 * @attr description - Helper text below the control
 * @attr error - Validation message; sets aria-invalid
 * @attr width - full | half (default: half)
 * @attr disabled - Disables the control
 * @attr required - Marks field as required
 *
 * @event viking-change - `{ detail: { value: string } }`
 *
 * @example
 * <viking-select-wc label="Retention" name="retention" value="30d">
 *   <option value="7d">7 days</option>
 *   <option value="30d">30 days</option>
 * </viking-select-wc>
 */
export class VikingSelectWc extends HTMLElement {
  static readonly formAssociated = true;
  static readonly tag = 'viking-select-wc';

  static get observedAttributes(): string[] {
    return [
      'label',
      'name',
      'value',
      'placeholder',
      'description',
      'error',
      'width',
      'disabled',
      'required',
    ];
  }

  private readonly shadow: ShadowRoot;
  private readonly internals: ElementInternals;
  private selectEl: HTMLSelectElement | null = null;
  private optionObserver: MutationObserver | null = null;
  private readonly controlId = vikingWcUid('viking-select');

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.internals = this.attachInternals();
    attachShadowStyles(this.shadow, VIKING_SELECT_STYLES);
  }

  connectedCallback(): void {
    this.render();
    this.syncOptions();
    this.observeOptions();
    this.selectEl?.addEventListener('change', this.onChange);
  }

  disconnectedCallback(): void {
    this.selectEl?.removeEventListener('change', this.onChange);
    this.optionObserver?.disconnect();
    this.optionObserver = null;
  }

  attributeChangedCallback(name: string): void {
    if (!this.isConnected) {
      return;
    }
    if (name === 'value' && this.selectEl) {
      this.selectEl.value = this.getAttribute('value') ?? '';
      this.syncFormValue();
      return;
    }
    if (name === 'error' || name === 'description' || name === 'label') {
      this.render();
      this.syncOptions();
      return;
    }
    this.render();
    this.syncOptions();
  }

  get value(): string {
    return this.selectEl?.value ?? this.getAttribute('value') ?? '';
  }

  set value(next: string) {
    this.setAttribute('value', next);
    if (this.selectEl) {
      this.selectEl.value = next;
    }
    this.syncFormValue();
  }

  private readonly onChange = (): void => {
    const value = this.selectEl?.value ?? '';
    this.setAttribute('value', value);
    this.syncFormValue();
    this.dispatchEvent(
      new CustomEvent('viking-change', { bubbles: true, composed: true, detail: { value } }),
    );
  };

  private syncFormValue(): void {
    setFormValue(this.internals, this.value);
  }

  private observeOptions(): void {
    this.optionObserver?.disconnect();
    this.optionObserver = new MutationObserver(() => this.syncOptions());
    this.optionObserver.observe(this, { childList: true, subtree: true, characterData: true });
  }

  private render(): void {
    const label = this.getAttribute('label') ?? '';
    const name = this.getAttribute('name') ?? '';
    const disabled = this.hasAttribute('disabled');
    const required = this.hasAttribute('required');
    const error = this.getAttribute('error') ?? '';
    const description = this.getAttribute('description') ?? '';
    const describedBy = [
      description && `${this.controlId}-desc`,
      error && `${this.controlId}-error`,
    ]
      .filter(Boolean)
      .join(' ');

    this.shadow.innerHTML = `
      <div class="viking-field" part="field">
        ${label ? `<label class="viking-field-label" part="label" for="${this.controlId}">${escapeHtml(label)}</label>` : ''}
        <select
          id="${this.controlId}"
          class="viking-select-native"
          part="control"
          ${name ? `name="${escapeHtml(name)}"` : ''}
          ${disabled ? 'disabled' : ''}
          ${required ? 'required' : ''}
          ${error ? 'aria-invalid="true"' : ''}
          ${describedBy ? `aria-describedby="${describedBy}"` : ''}
        ></select>
        ${description ? `<p id="${this.controlId}-desc" class="viking-field-description" part="description">${escapeHtml(description)}</p>` : ''}
        ${error ? `<p id="${this.controlId}-error" class="viking-field-error" part="error" role="alert">${escapeHtml(error)}</p>` : ''}
      </div>
    `;

    this.selectEl = this.shadow.querySelector('select');
    const value = this.getAttribute('value');
    if (this.selectEl && value) {
      this.selectEl.value = value;
    }
    this.syncFormValue();
  }

  private syncOptions(): void {
    if (!this.selectEl) {
      return;
    }

    const currentValue = this.selectEl.value;
    this.selectEl.innerHTML = '';
    const options = this.querySelectorAll('option');

    if (options.length === 0) {
      const placeholder = this.getAttribute('placeholder') ?? 'Select…';
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = placeholder;
      opt.disabled = true;
      opt.selected = !this.getAttribute('value');
      this.selectEl.append(opt);
      return;
    }

    options.forEach(opt => {
      this.selectEl?.append(opt.cloneNode(true));
    });

    const value = this.getAttribute('value');
    if (value) {
      this.selectEl.value = value;
    } else if (currentValue) {
      this.selectEl.value = currentValue;
    }
    this.syncFormValue();
  }
}

export const registerVikingSelectWc = (): void => {
  defineCustomElement(VikingSelectWc.tag, VikingSelectWc);
};
