import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  model,
} from '@angular/core';

/**
 * flux-popover — anchored floating panel (https://fluxui.dev/components/popover).
 * Project the trigger with the `fluxTrigger` attribute; everything else becomes
 * the panel content. Closes on Escape or outside interaction.
 */
@Component({
  selector: 'flux-popover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(click)': 'onHostClick($event)',
    '(document:click)': 'onDocumentClick($event)',
    '(keydown.escape)': 'open.set(false)',
  },
  template: `
    <span class="flux-popover-trigger">
      <ng-content select="[fluxTrigger]" />
    </span>
    @if (open()) {
      <div class="flux-popover-panel" [class.flux-popover-end]="align() === 'end'" role="dialog">
        <ng-content />
      </div>
    }
  `,
  styles: [
    `
      :host {
        position: relative;
        display: inline-block;
      }
      .flux-popover-trigger {
        display: inline-flex;
      }
      .flux-popover-panel {
        position: absolute;
        top: calc(100% + var(--flux-space-1));
        left: 0;
        min-width: 234px;
        max-width: 90vw;
        background: var(--flux-surface);
        border: 1px solid var(--flux-border-strong);
        border-radius: var(--flux-radius);
        box-shadow: var(--flux-shadow-md);
        padding: var(--flux-space-2);
        z-index: var(--flux-z-overlay);
        font-family: var(--flux-font-family);
        font-size: var(--flux-font-size);
        color: var(--flux-text);
      }
      .flux-popover-end {
        left: auto;
        right: 0;
      }
    `,
  ],
})
export class FluxPopover {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly open = model<boolean>(false);
  readonly align = input<'start' | 'end'>('start');

  /** Toggles when the (focusable, projected) trigger is activated. */
  protected onHostClick = (event: Event): void => {
    const trigger = this.host.nativeElement.querySelector('.flux-popover-trigger');
    if (trigger?.contains(event.target as Node)) {
      this.open.update(value => !value);
    }
  };

  protected onDocumentClick = (event: Event): void => {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  };
}
