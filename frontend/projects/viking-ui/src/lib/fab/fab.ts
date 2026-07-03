import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { VikingIcon } from '../icon/icon';
import { VikingIconName } from '../core/icons';

/**
 * viking-fab — floating action button (fixed bottom-right).
 */
@Component({
  selector: 'viking-fab',
  imports: [VikingIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="viking-fab"
      [attr.aria-label]="label()"
      [disabled]="disabled()"
      (click)="pressed.emit($event)"
    >
      <viking-icon [name]="icon()" [size]="24" />
    </button>
  `,
  styles: [
    `
      :host {
        display: contents;
      }
      .viking-fab {
        position: fixed;
        bottom: var(--viking-space-3);
        right: var(--viking-space-3);
        width: var(--viking-space-7);
        height: var(--viking-space-7);
        border-radius: var(--viking-radius-pill);
        background: var(--viking-accent);
        color: var(--viking-accent-content);
        border: 1px solid color-mix(in srgb, var(--viking-accent) 80%, var(--viking-black));
        box-shadow: var(--viking-shadow-md);
        cursor: pointer;
        z-index: var(--viking-z-overlay);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: var(--viking-transition-interactive);
      }
      .viking-fab:hover:not(:disabled) {
        transform: translateY(var(--viking-state-hover-lift));
        box-shadow: var(--viking-shadow-hover);
        background: var(--viking-accent-hover);
      }
      .viking-fab:active:not(:disabled) {
        transform: translateY(0) scale(var(--viking-state-active-scale));
      }
      .viking-fab:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
      }
      .viking-fab:disabled {
        opacity: var(--viking-state-disabled-opacity);
        cursor: not-allowed;
      }
    `,
  ],
})
export class VikingFab {
  readonly icon = input.required<VikingIconName>();
  readonly label = input.required<string>();
  readonly disabled = input<boolean>(false);
  readonly pressed = output<MouseEvent>();
}
