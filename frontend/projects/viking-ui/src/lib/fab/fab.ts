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
        bottom: calc(var(--viking-space-2) * 1.75);
        right: calc(var(--viking-space-2) * 1.75);
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: var(--viking-accent);
        color: var(--viking-accent-content);
        border: 1px solid var(--viking-border);
        box-shadow: var(--viking-shadow-sm);
        cursor: pointer;
        z-index: 999;
        display: flex;
        align-items: center;
        justify-content: center;
        transition:
          transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
          box-shadow 0.2s ease,
          filter 0.2s;
      }
      .viking-fab:hover:not(:disabled) {
        transform: scale(1.08);
        box-shadow: var(--viking-shadow-md);
        filter: brightness(1.1);
      }
      .viking-fab:active:not(:disabled) {
        transform: scale(0.95);
      }
      .viking-fab:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
      }
      .viking-fab:disabled {
        opacity: 0.55;
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
