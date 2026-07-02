import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { VIKING_TABS, VikingTabs } from './tabs';

/**
 * viking-tab — tab trigger button inside viking-tabs.
 */
@Component({
  selector: 'viking-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      role="tab"
      class="viking-tab"
      [class.viking-active]="active()"
      [attr.aria-selected]="active()"
      [attr.tabindex]="active() ? 0 : -1"
      [disabled]="disabled()"
      (click)="select()"
    >
      <ng-content />
    </button>
  `,
  styles: [
    `
      .viking-tab {
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size-ui);
        font-weight: 700;
        letter-spacing: 0.02em;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: var(--viking-control-height-sm);
        min-width: var(--viking-btn-min-width, 120px);
        padding: 0 var(--viking-space-2);
        border: 1px solid transparent;
        border-radius: var(--viking-radius);
        background: transparent;
        color: var(--viking-text-muted);
        cursor: pointer;
        transition: var(--viking-transition);
      }
      .viking-tab:hover:not(:disabled) {
        color: var(--viking-text);
        background: var(--viking-accent-soft);
      }
      .viking-tab:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
      }
      .viking-tab.viking-active {
        color: var(--viking-accent-content);
        background: var(--viking-accent);
        border-color: var(--viking-accent);
      }
      .viking-tab:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
    `,
  ],
})
export class VikingTab {
  private readonly tabs = inject(VikingTabs, { optional: true });

  readonly value = input.required<string>();
  readonly disabled = input(false);

  protected active = () => (this.tabs?.value() ?? '') === this.value();

  protected select = (): void => {
    if (this.disabled() || !this.tabs) return;
    this.tabs.value.set(this.value());
  };
}
