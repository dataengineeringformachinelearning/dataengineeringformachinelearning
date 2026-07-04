import { attachShadowStyles } from '../core/base';

const TONES = new Set(['accent', 'info', 'success', 'warning', 'danger', 'secondary']);

const VIKING_CALLOUT_STYLES = `
:host {
  display: block;
  font-family: var(--viking-font-family);
}

.viking-callout {
  display: flex;
  align-items: flex-start;
  gap: var(--viking-space-2);
  padding: var(--viking-space-2);
  border-radius: var(--viking-radius-lg);
  border: 1px solid var(--viking-border);
  border-left-width: 3px;
  background: var(--viking-surface-alt);
  color: var(--viking-text);
  font-size: var(--viking-font-size-sm);
  box-shadow: var(--viking-shadow-sm);
}

.viking-callout-icon {
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--viking-text-muted);
  font-size: var(--viking-font-size-lg);
  line-height: 1;
}

.viking-callout-body {
  flex: 1;
  min-width: 0;
}

.viking-callout-heading {
  margin: 0 0 var(--viking-space-half);
  font-weight: var(--viking-font-weight-semibold);
  color: var(--viking-text);
}

.viking-callout-text {
  margin: 0;
  color: var(--viking-text-muted);
  line-height: var(--viking-line-height-relaxed);
}

.viking-callout-info {
  border-color: color-mix(in srgb, var(--viking-info) 45%, transparent);
  border-left-color: var(--viking-info);
  background: color-mix(in srgb, var(--viking-info) 8%, var(--viking-surface));
}

.viking-callout-info .viking-callout-icon {
  color: var(--viking-info);
}

.viking-callout-accent {
  border-color: var(--viking-accent);
  border-left-color: var(--viking-accent);
  background: var(--viking-accent-soft);
}

.viking-callout-accent .viking-callout-icon {
  color: var(--viking-accent);
}

.viking-callout-success {
  border-color: color-mix(in srgb, var(--viking-success) 45%, transparent);
  border-left-color: var(--viking-success);
  background: color-mix(in srgb, var(--viking-success) 8%, var(--viking-surface));
}

.viking-callout-success .viking-callout-icon {
  color: var(--viking-success);
}

.viking-callout-warning {
  border-color: color-mix(in srgb, var(--viking-warning) 45%, transparent);
  border-left-color: var(--viking-warning);
  background: color-mix(in srgb, var(--viking-warning) 8%, var(--viking-surface));
}

.viking-callout-warning .viking-callout-icon {
  color: var(--viking-warning);
}

.viking-callout-danger {
  border-color: color-mix(in srgb, var(--viking-danger) 45%, transparent);
  border-left-color: var(--viking-danger);
  background: color-mix(in srgb, var(--viking-danger) 8%, var(--viking-surface));
}

.viking-callout-danger .viking-callout-icon {
  color: var(--viking-danger);
}
`;

const TONE_ICONS: Record<string, string> = {
  accent: '◆',
  info: 'ℹ',
  success: '✓',
  warning: '⚠',
  danger: '✕',
  secondary: '◆',
};

/**
 * Framework-agnostic Viking callout Web Component.
 * Tag: `viking-callout-wc`
 */
export class VikingCalloutWc extends HTMLElement {
  static readonly tag = 'viking-callout-wc';

  static get observedAttributes(): string[] {
    return ['tone', 'heading'];
  }

  private readonly shadow: ShadowRoot;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    attachShadowStyles(this.shadow, VIKING_CALLOUT_STYLES);
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
    const value = this.getAttribute('tone') ?? 'info';
    return TONES.has(value) ? value : 'info';
  }

  private render(): void {
    const heading = this.getAttribute('heading') ?? '';
    const icon = TONE_ICONS[this.tone] ?? TONE_ICONS.info;
    this.shadow.innerHTML = `
      <div class="viking-callout viking-callout-${this.tone}" role="note" part="surface">
        <span class="viking-callout-icon" aria-hidden="true" part="icon">${icon}</span>
        <div class="viking-callout-body" part="body">
          ${heading ? `<p class="viking-callout-heading" part="heading">${heading}</p>` : ''}
          <div class="viking-callout-text" part="text"><slot></slot></div>
        </div>
      </div>
    `;
  }
}

export const registerVikingCalloutWc = (): void => {
  if (!customElements.get(VikingCalloutWc.tag)) {
    customElements.define(VikingCalloutWc.tag, VikingCalloutWc);
  }
};
