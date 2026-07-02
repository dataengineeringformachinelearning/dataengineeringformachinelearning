import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FluxIcon } from '../icon/icon';
import { FluxIconName } from '../core/icons';

/**
 * flux-fab — floating action button (fixed bottom-right).
 */
@Component({
  selector: 'flux-fab',
  imports: [FluxIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="flux-fab"
      [attr.aria-label]="label()"
      [disabled]="disabled()"
      (click)="pressed.emit($event)"
    >
      <flux-icon [name]="icon()" [size]="24" />
    </button>
  `,
  styles: [
    `
      :host {
        display: contents;
      }
      .flux-fab {
        position: fixed;
        bottom: calc(var(--flux-space-2) * 1.75);
        right: calc(var(--flux-space-2) * 1.75);
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: var(--flux-accent);
        color: var(--flux-accent-content);
        border: 1px solid var(--flux-border);
        box-shadow: var(--flux-shadow-sm);
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
      .flux-fab:hover:not(:disabled) {
        transform: scale(1.08);
        box-shadow: var(--flux-shadow-md);
        filter: brightness(1.1);
      }
      .flux-fab:active:not(:disabled) {
        transform: scale(0.95);
      }
      .flux-fab:focus-visible {
        outline: var(--flux-ring-width) solid var(--flux-ring);
        outline-offset: var(--flux-ring-offset);
      }
      .flux-fab:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
    `,
  ],
})
export class FluxFab {
  readonly icon = input.required<FluxIconName>();
  readonly label = input.required<string>();
  readonly disabled = input<boolean>(false);
  readonly pressed = output<MouseEvent>();
}
