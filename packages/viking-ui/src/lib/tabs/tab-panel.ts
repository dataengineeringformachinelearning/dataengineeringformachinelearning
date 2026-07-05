import {
  ChangeDetectionStrategy,
  Component,
  Optional,
  computed,
  input,
} from "@angular/core";
import { VIKING_TABS, VikingTabs } from "./tabs";

/**
 * viking-tab-panel — tabpanel region inside viking-tabs.
 */
@Component({
  selector: "viking-tab-panel",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: "tabpanel",
    "[attr.id]": "panelId()",
    "[attr.aria-labelledby]": "tabId()",
    "[attr.hidden]": 'hidden() ? "" : null',
    "[class.viking-hidden]": "hidden()",
  },
  template: `<ng-content />`,
  styles: [
    `
      :host {
        display: block;
        padding: var(--viking-space-2);
        border: 1px solid var(--viking-border);
        border-radius: var(--viking-radius);
        background: var(--viking-surface);
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size);
        color: var(--viking-text);
        line-height: var(--viking-line-height-relaxed);
        animation: viking-fade-in var(--viking-duration-fast)
          var(--viking-ease-out);
      }
      :host(.viking-hidden) {
        display: none;
      }
      @media (prefers-reduced-motion: reduce) {
        :host {
          animation: none;
        }
      }
    `,
  ],
})
export class VikingTabPanel {
  constructor(@Optional() private readonly tabs: VikingTabs | null) {}

  readonly value = input.required<string>();

  protected readonly panelId = computed(
    () => `viking-tab-panel-${this.value()}`,
  );
  protected readonly tabId = computed(() => `viking-tab-${this.value()}`);

  protected hidden = () => (this.tabs?.value() ?? "") !== this.value();
}
