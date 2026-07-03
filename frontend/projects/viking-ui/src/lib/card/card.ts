import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * viking-card — surface container.
 * Compose with viking-card-header / viking-card-footer for structured layouts.
 */
@Component({
  selector: 'viking-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.viking-card-interactive]': 'interactive()' },
  template: `<ng-content />`,
  styles: [
    `
      :host {
        display: block;
        background: var(--viking-surface);
        border: 1px solid var(--viking-border);
        border-radius: var(--viking-radius-lg);
        box-shadow: var(--viking-shadow-sm);
        padding: var(--viking-space-3);
        color: var(--viking-text);
        transition: var(--viking-transition);
      }
      :host(.viking-card-interactive):hover {
        border-color: var(--viking-accent-strong);
        box-shadow: var(--viking-shadow-md);
        transform: translateY(-2px);
      }
    `,
  ],
})
export class VikingCard {
  readonly interactive = input<boolean>(false);
}

/** Header row for viking-card. */
@Component({
  selector: 'viking-card-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content />`,
  styles: [
    `
      :host {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--viking-space-2);
        padding-bottom: var(--viking-space-2);
        margin-bottom: var(--viking-space-2);
        border-bottom: 1px solid var(--viking-border);
      }
    `,
  ],
})
export class VikingCardHeader {}

/** Footer row for viking-card. */
@Component({
  selector: 'viking-card-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content />`,
  styles: [
    `
      :host {
        display: flex;
        align-items: center;
        gap: var(--viking-space-1);
        padding-top: var(--viking-space-2);
        margin-top: var(--viking-space-2);
        border-top: 1px solid var(--viking-border);
      }
    `,
  ],
})
export class VikingCardFooter {}
