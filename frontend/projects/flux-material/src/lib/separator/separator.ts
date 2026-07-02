import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * flux-separator — horizontal/vertical rule with optional label
 * (https://fluxui.dev/components/separator).
 */
@Component({
  selector: 'flux-separator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'separator',
    '[attr.aria-orientation]': 'orientation()',
    '[class.flux-vertical]': "orientation() === 'vertical'",
  },
  template: `
    @if (text() && orientation() === 'horizontal') {
      <span class="flux-separator-line" aria-hidden="true"></span>
      <span class="flux-separator-text">{{ text() }}</span>
      <span class="flux-separator-line" aria-hidden="true"></span>
    } @else {
      <span class="flux-separator-line" aria-hidden="true"></span>
    }
  `,
  styles: [
    `
      :host {
        display: flex;
        align-items: center;
        gap: var(--flux-space-2);
        width: 100%;
      }
      :host(.flux-vertical) {
        width: auto;
        align-self: stretch;
      }
      .flux-separator-line {
        flex: 1;
        border-top: 1px solid var(--flux-border);
      }
      :host(.flux-vertical) .flux-separator-line {
        flex: none;
        border-top: none;
        border-left: 1px solid var(--flux-border);
        height: 100%;
        min-height: var(--flux-space-3);
      }
      .flux-separator-text {
        font-family: var(--flux-font-family);
        font-size: var(--flux-font-size);
        color: var(--flux-text-muted);
        white-space: nowrap;
      }
    `,
  ],
})
export class FluxSeparator {
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');
  readonly text = input<string>('');
}
