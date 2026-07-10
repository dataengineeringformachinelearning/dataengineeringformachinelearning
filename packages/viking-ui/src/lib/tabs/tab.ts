import {
  ChangeDetectionStrategy,
  Component,
  Optional,
  computed,
  input,
} from "@angular/core";
import { VIKING_TABS, VikingTabs } from "./tabs";

/**
 * viking-tab — tab trigger button inside viking-tabs.
 */
@Component({
  selector: "viking-tab",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      role="tab"
      class="viking-tab"
      [class.viking-active]="active()"
      [id]="tabId()"
      [attr.aria-selected]="active()"
      [attr.aria-controls]="panelId()"
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
        font-size: var(--viking-font-size-sm);
        font-weight: var(--viking-font-weight-semibold);
        letter-spacing: var(--viking-letter-spacing-wide);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--viking-space-2);
        min-height: var(--viking-control-height-sm);
        min-width: var(--viking-btn-min-width, 120px);
        padding: var(--viking-space-0-5) var(--viking-space-2);
        border: 1px solid transparent;
        border-radius: var(--viking-radius);
        background: transparent;
        color: var(--viking-text-muted);
        cursor: pointer;
        transition: var(--viking-transition-interactive);
        position: relative;
        -webkit-tap-highlight-color: transparent;
      }
      .viking-tab viking-app-icon,
      .viking-tab viking-icon,
      .viking-tab [data-viking-icon] {
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-inline-end: 0;
      }
      @media (max-width: 767px) {
        .viking-tab {
          min-height: var(--viking-control-height);
          flex: 1 0 auto;
          min-width: max-content;
          scroll-snap-align: start;
          padding-inline: var(--viking-space-2);
        }
      }
      .viking-tab:hover:not(:disabled):not(.viking-active) {
        color: var(--viking-text);
        background: var(--viking-accent-soft);
      }
      .viking-tab:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
      }
      .viking-tab:active:not(:disabled) {
        transform: scale(var(--viking-state-active-scale));
      }
      .viking-tab.viking-active {
        color: var(--viking-accent-content);
        background: var(--viking-accent);
        border-color: color-mix(
          in srgb,
          var(--viking-accent) 80%,
          var(--viking-black)
        );
        box-shadow: var(--viking-shadow-sm);
      }
      .viking-tab:disabled {
        opacity: var(--viking-state-disabled-opacity);
        cursor: not-allowed;
      }
    `,
  ],
})
export class VikingTab {
  constructor(@Optional() private readonly tabs: VikingTabs | null) {}

  readonly value = input.required<string>();
  readonly disabled = input(false);

  protected readonly tabId = computed(() => `viking-tab-${this.value()}`);
  protected readonly panelId = computed(
    () => `viking-tab-panel-${this.value()}`,
  );

  protected active = () => (this.tabs?.value() ?? "") === this.value();

  protected select = (): void => {
    if (this.disabled() || !this.tabs) {
      return;
    }
    this.tabs.value.set(this.value());
  };
}
