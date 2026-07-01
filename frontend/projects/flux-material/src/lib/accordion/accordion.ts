import { ChangeDetectionStrategy, Component, inject, input, model } from '@angular/core';
import { FluxIcon } from '../icon/icon';
import { fluxUid } from '../core/uid';

/**
 * flux-accordion — collapsible content panels (https://fluxui.dev/components/accordion).
 * Set exclusive to allow only one open item at a time.
 */
@Component({
  selector: 'flux-accordion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content />`,
  styles: [
    `
      :host {
        display: block;
        border: 1px solid var(--flux-border);
        border-radius: var(--flux-radius);
        background: var(--flux-surface);
        overflow: hidden;
      }
      :host ::ng-deep flux-accordion-item:not(:last-child) {
        border-bottom: 1px solid var(--flux-border);
      }
    `,
  ],
})
export class FluxAccordion {
  readonly exclusive = input<boolean>(false);

  private openItem: FluxAccordionItem | null = null;

  /** Called by items when they open, to enforce exclusive mode. */
  readonly notifyOpened = (item: FluxAccordionItem): void => {
    if (this.exclusive() && this.openItem && this.openItem !== item) {
      this.openItem.expanded.set(false);
    }
    this.openItem = item;
  };
}

/** A single expandable section within flux-accordion. */
@Component({
  selector: 'flux-accordion-item',
  imports: [FluxIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="flux-accordion-trigger"
      [attr.aria-expanded]="expanded()"
      [attr.aria-controls]="panelId"
      (click)="toggle()"
    >
      <span class="flux-accordion-heading">{{ heading() }}</span>
      <flux-icon [name]="expanded() ? 'chevron-up' : 'chevron-down'" [size]="18" />
    </button>
    @if (expanded()) {
      <div class="flux-accordion-panel" [id]="panelId">
        <ng-content />
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .flux-accordion-trigger {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--flux-space-2);
        width: 100%;
        border: none;
        background: transparent;
        color: var(--flux-text);
        font-family: var(--flux-font-family);
        font-size: var(--flux-font-size);
        font-weight: 600;
        padding: var(--flux-space-2);
        cursor: pointer;
        text-align: left;
        transition: var(--flux-transition);
      }
      .flux-accordion-trigger:hover {
        background: var(--flux-accent-soft);
      }
      .flux-accordion-trigger:focus-visible {
        outline: var(--flux-ring-width) solid var(--flux-ring);
        outline-offset: -3px;
      }
      .flux-accordion-panel {
        padding: 0 var(--flux-space-2) var(--flux-space-2);
        color: var(--flux-text-muted);
        font-family: var(--flux-font-family);
        font-size: var(--flux-font-size);
        line-height: 1.6;
      }
    `,
  ],
})
export class FluxAccordionItem {
  private readonly accordion = inject(FluxAccordion, { optional: true });

  readonly heading = input.required<string>();
  readonly expanded = model<boolean>(false);

  protected readonly panelId = fluxUid('flux-accordion-panel');

  protected toggle = (): void => {
    this.expanded.update(value => !value);
    if (this.expanded()) {
      this.accordion?.notifyOpened(this);
    }
  };
}
