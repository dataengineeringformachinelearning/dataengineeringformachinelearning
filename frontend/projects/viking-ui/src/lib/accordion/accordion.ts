import { ChangeDetectionStrategy, Component, inject, input, model } from '@angular/core';
import { VikingIcon } from '../icon/icon';
import { fluxUid } from '../core/uid';

/**
 * viking-accordion — collapsible content panels (https://fluxui.dev/components/accordion).
 * Set exclusive to allow only one open item at a time.
 */
@Component({
  selector: 'viking-accordion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content />`,
  styles: [
    `
      :host {
        display: block;
        border: 1px solid var(--viking-border);
        border-radius: var(--viking-radius);
        background: var(--viking-surface);
        overflow: hidden;
      }
      :host ::ng-deep viking-accordion-item:not(:last-child) {
        border-bottom: 1px solid var(--viking-border);
      }
    `,
  ],
})
export class VikingAccordion {
  readonly exclusive = input<boolean>(false);

  private openItem: VikingAccordionItem | null = null;

  /** Called by items when they open, to enforce exclusive mode. */
  readonly notifyOpened = (item: VikingAccordionItem): void => {
    if (this.exclusive() && this.openItem && this.openItem !== item) {
      this.openItem.expanded.set(false);
    }
    this.openItem = item;
  };
}

/** A single expandable section within viking-accordion. */
@Component({
  selector: 'viking-accordion-item',
  imports: [VikingIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="viking-accordion-trigger"
      [attr.aria-expanded]="expanded()"
      [attr.aria-controls]="panelId"
      (click)="toggle()"
    >
      <span class="viking-accordion-heading">{{ heading() }}</span>
      <viking-icon [name]="expanded() ? 'chevron-up' : 'chevron-down'" [size]="18" />
    </button>
    @if (expanded()) {
      <div class="viking-accordion-panel" [id]="panelId">
        <ng-content />
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .viking-accordion-trigger {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--viking-space-2);
        width: 100%;
        border: none;
        background: transparent;
        color: var(--viking-text);
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size-ui);
        font-weight: 700;
        padding: var(--viking-space-2);
        cursor: pointer;
        text-align: left;
        transition: var(--viking-transition);
      }
      .viking-accordion-trigger:hover {
        background: var(--viking-accent-soft);
      }
      .viking-accordion-trigger:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: -3px;
      }
      .viking-accordion-panel {
        padding: 0 var(--viking-space-2) var(--viking-space-2);
        color: var(--viking-text-muted);
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size);
        line-height: 1.6;
      }
    `,
  ],
})
export class VikingAccordionItem {
  private readonly accordion = inject(VikingAccordion, { optional: true });

  readonly heading = input.required<string>();
  readonly expanded = model<boolean>(false);

  protected readonly panelId = fluxUid('viking-accordion-panel');

  protected toggle = (): void => {
    this.expanded.update(value => !value);
    if (this.expanded()) {
      this.accordion?.notifyOpened(this);
    }
  };
}
