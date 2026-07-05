import { ChangeDetectionStrategy, Component, ElementRef, input, model } from '@angular/core';

/**
 * viking-popover — anchored floating panel.
 * Project the trigger with the `vikingTrigger` attribute; everything else becomes
 * the panel content. Closes on Escape or outside interaction.
 */
@Component({
  selector: 'viking-popover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(click)': 'onHostClick($event)',
    '(document:click)': 'onDocumentClick($event)',
    '(keydown.escape)': 'open.set(false)',
  },
  template: `
    <span class="viking-popover-trigger">
      <ng-content select="[vikingTrigger]" />
    </span>
    @if (open()) {
      <div
        class="viking-popover-panel"
        [class.viking-popover-end]="align() === 'end'"
        role="dialog"
      >
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
      .viking-popover-trigger {
        display: inline-flex;
      }
      .viking-popover-panel {
        position: absolute;
        top: calc(100% + var(--viking-space-1));
        left: 0;
        min-width: 234px;
        max-width: 90vw;
        background: var(--viking-surface);
        border: 1px solid var(--viking-border-strong);
        border-radius: var(--viking-radius);
        box-shadow: var(--viking-shadow-md);
        padding: var(--viking-space-2);
        z-index: var(--viking-z-overlay);
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size-ui);
        color: var(--viking-text);
      }
      .viking-popover-end {
        left: auto;
        right: 0;
      }
    `,
  ],
})
export class VikingPopover {
  readonly open = model<boolean>(false);
  readonly align = input<'start' | 'end'>('start');

  constructor(private readonly host: ElementRef<HTMLElement>) {}

  /** Toggles when the (focusable, projected) trigger is activated. */
  protected onHostClick = (event: Event): void => {
    const trigger = this.host.nativeElement.querySelector('.viking-popover-trigger');
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
