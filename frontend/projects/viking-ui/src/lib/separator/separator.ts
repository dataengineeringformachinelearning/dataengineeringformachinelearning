import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * viking-separator — horizontal/vertical rule with optional label
 *.
 */
@Component({
  selector: 'viking-separator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'separator',
    '[attr.aria-orientation]': 'orientation()',
    '[class.viking-vertical]': "orientation() === 'vertical'",
  },
  template: `
    @if (text() && orientation() === 'horizontal') {
      <span class="viking-separator-line" aria-hidden="true"></span>
      <span class="viking-separator-text">{{ text() }}</span>
      <span class="viking-separator-line" aria-hidden="true"></span>
    } @else {
      <span class="viking-separator-line" aria-hidden="true"></span>
    }
  `,
  styles: [
    `
      :host {
        display: flex;
        align-items: center;
        gap: var(--viking-space-2);
        width: 100%;
      }
      :host(.viking-vertical) {
        width: auto;
        align-self: stretch;
      }
      .viking-separator-line {
        flex: 1;
        border-top: 1px solid var(--viking-border);
      }
      :host(.viking-vertical) .viking-separator-line {
        flex: none;
        border-top: none;
        border-left: 1px solid var(--viking-border);
        height: 100%;
        min-height: var(--viking-space-3);
      }
      .viking-separator-text {
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size);
        color: var(--viking-text-muted);
        white-space: nowrap;
      }
    `,
  ],
})
export class VikingSeparator {
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');
  readonly text = input<string>('');
}
