import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * viking-kbd — keyboard hint chip (Spartan-inspired, zero-dependency).
 */
@Component({
  selector: 'viking-kbd',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content />`,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size-ui);
        font-weight: 600;
        line-height: 1.2;
        color: var(--viking-text-muted);
        background: var(--viking-surface-alt);
        border: 1px solid var(--viking-border);
        border-radius: calc(var(--viking-radius) / 2);
        padding: 2px var(--viking-space-1);
        min-width: 1.5rem;
        box-shadow: inset 0 -1px 0 color-mix(in srgb, var(--viking-border) 65%, transparent);
      }
    `,
  ],
})
export class VikingKbd {}
