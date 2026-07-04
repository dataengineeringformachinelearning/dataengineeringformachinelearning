import { attachShadowStyles } from '../core/base';
import { escapeHtml } from '../core/dom';
import { renderInlineIcon, TONE_ICON_NAMES } from '../core/icons-inline';
import { VIKING_CALLOUT_STYLES } from '../core/styles';
import type { VikingWcTone } from '../core/types';

const TONES = new Set<VikingWcTone>([
  'accent',
  'secondary',
  'success',
  'warning',
  'danger',
  'info',
  'muted',
]);

/**
 * Framework-agnostic Viking callout Web Component.
 * Tag: `viking-callout-wc`
 *
 * @attr tone - Semantic tone (default: info)
 * @attr heading - Bold callout title
 * @attr icon - Override leading icon from the Viking registry
 * @attr dismissible - Shows dismiss control; dispatches `viking-close`
 *
 * @example
 * <viking-callout-wc tone="warning" heading="Degraded worker">Lag exceeds 3s.</viking-callout-wc>
 */
export class VikingCalloutWc extends HTMLElement {
  static readonly tag = 'viking-callout-wc';

  static get observedAttributes(): string[] {
    return ['tone', 'heading', 'icon', 'dismissible', 'hidden'];
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

  private get tone(): VikingWcTone {
    const value = (this.getAttribute('tone') ?? 'info') as VikingWcTone;
    return TONES.has(value) ? value : 'info';
  }

  private get dismissible(): boolean {
    return this.hasAttribute('dismissible') && this.getAttribute('dismissible') !== 'false';
  }

  private readonly onDismiss = (): void => {
    this.setAttribute('hidden', '');
    this.dispatchEvent(new CustomEvent('viking-close', { bubbles: true, composed: true }));
  };

  private render(): void {
    const heading = this.getAttribute('heading') ?? '';
    const iconName = this.getAttribute('icon') ?? TONE_ICON_NAMES[this.tone] ?? 'info';
    const iconMarkup = renderInlineIcon(iconName, 22, 'viking-callout-icon');

    this.shadow.innerHTML = `
      <div class="viking-callout viking-callout-${this.tone}" role="note" part="surface">
        <span part="icon">${iconMarkup}</span>
        <div class="viking-callout-body" part="body">
          ${heading ? `<p class="viking-callout-heading" part="heading">${escapeHtml(heading)}</p>` : ''}
          <div class="viking-callout-text" part="text"><slot></slot></div>
        </div>
        ${this.dismissible ? `<button type="button" class="viking-callout-close" part="close" aria-label="Dismiss">${renderInlineIcon('x', 18)}</button>` : ''}
      </div>
    `;

    this.shadow.querySelector('.viking-callout-close')?.addEventListener('click', this.onDismiss);
  }
}

export const registerVikingCalloutWc = (): void => {
  if (!customElements.get(VikingCalloutWc.tag)) {
    customElements.define(VikingCalloutWc.tag, VikingCalloutWc);
  }
};
