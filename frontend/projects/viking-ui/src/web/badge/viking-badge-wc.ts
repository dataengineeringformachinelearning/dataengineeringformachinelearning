import { attachShadowStyles } from '../core/base';

const TONES = new Set(['accent', 'success', 'warning', 'danger', 'subtle']);

const VIKING_BADGE_STYLES = `
:host {
  display: inline-flex;
  align-items: center;
  gap: var(--viking-space-half);
  padding: var(--viking-space-half) var(--viking-space-1);
  font-family: var(--viking-font-family);
  font-size: var(--viking-font-size-xs);
  font-weight: var(--viking-font-weight-semibold);
  letter-spacing: var(--viking-letter-spacing-wide);
  border-radius: var(--viking-radius-pill);
  border: 1px solid var(--viking-border);
  background: var(--viking-surface-alt);
  color: var(--viking-text);
  white-space: nowrap;
}

:host([tone='accent']) {
  background: var(--viking-accent);
  border-color: color-mix(in srgb, var(--viking-accent) 80%, var(--viking-black));
  color: var(--viking-accent-content);
}

:host([tone='success']) {
  background: color-mix(in srgb, var(--viking-success) 18%, var(--viking-surface));
  border-color: color-mix(in srgb, var(--viking-success) 40%, transparent);
  color: var(--viking-success);
}

:host([tone='warning']) {
  background: color-mix(in srgb, var(--viking-warning) 18%, var(--viking-surface));
  border-color: color-mix(in srgb, var(--viking-warning) 40%, transparent);
  color: var(--viking-warning);
}

:host([tone='danger']) {
  background: color-mix(in srgb, var(--viking-danger) 18%, var(--viking-surface));
  border-color: color-mix(in srgb, var(--viking-danger) 40%, transparent);
  color: var(--viking-danger);
}

:host([tone='subtle']) {
  background: var(--viking-surface-alt);
  color: var(--viking-text-muted);
  font-size: var(--viking-font-size-2xs);
}
`;

/**
 * Framework-agnostic Viking badge Web Component.
 * Tag: `viking-badge-wc`
 */
export class VikingBadgeWc extends HTMLElement {
  static readonly tag = 'viking-badge-wc';

  static get observedAttributes(): string[] {
    return ['tone'];
  }

  private readonly shadow: ShadowRoot;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    attachShadowStyles(this.shadow, VIKING_BADGE_STYLES);
  }

  connectedCallback(): void {
    this.render();
  }

  attributeChangedCallback(): void {
    if (this.isConnected) {
      this.render();
    }
  }

  private get tone(): string {
    const value = this.getAttribute('tone') ?? '';
    return TONES.has(value) ? value : '';
  }

  private render(): void {
    if (this.tone) {
      this.setAttribute('tone', this.tone);
    } else {
      this.removeAttribute('tone');
    }
    this.shadow.innerHTML = `<span part="label"><slot></slot></span>`;
  }
}

export const registerVikingBadgeWc = (): void => {
  if (!customElements.get(VikingBadgeWc.tag)) {
    customElements.define(VikingBadgeWc.tag, VikingBadgeWc);
  }
};
