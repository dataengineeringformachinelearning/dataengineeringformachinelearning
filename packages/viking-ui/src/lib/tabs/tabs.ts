import {
  ChangeDetectionStrategy,
  Component,
  contentChildren,
  InjectionToken,
  model,
} from "@angular/core";
import { VikingTab } from "./tab";

export const VIKING_TABS = new InjectionToken<VikingTabs>("VIKING_TABS");

/**
 * viking-tabs — tablist container with roving keyboard navigation.
 */
@Component({
  selector: "viking-tabs",
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: VIKING_TABS, useExisting: VikingTabs }],
  host: { class: "viking-tabs" },
  template: `
    <div
      class="viking-tabs-list"
      role="tablist"
      (keydown)="onTabKeydown($event)"
    >
      <ng-content select="viking-tab" />
    </div>
    <ng-content select="viking-tab-panel" />
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--viking-space-3);
        font-family: var(--viking-font-family);
      }
      .viking-tabs-list {
        display: flex;
        flex-wrap: nowrap;
        gap: var(--viking-space-2);
        padding: var(--viking-space-2) var(--viking-space-2);
        border: 1px solid var(--viking-border);
        border-radius: var(--viking-radius-xl);
        background: var(
          --viking-surface-recipe,
          color-mix(
            in srgb,
            var(--viking-surface-alt) 80%,
            var(--viking-surface)
          )
        );
        box-shadow:
          var(--viking-shadow-sm),
          inset 0 1px 0
            color-mix(in srgb, var(--viking-white-pure) 6%, transparent);
        position: relative;
        overflow-x: auto;
        scroll-snap-type: x proximity;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
        overscroll-behavior-x: contain;
      }
      .viking-tabs-list::before {
        content: "";
        position: absolute;
        inset: 0 0 auto;
        height: 1px;
        border-radius: inherit;
        background: linear-gradient(
          90deg,
          transparent,
          color-mix(
            in srgb,
            var(--viking-metallic-200)
              var(--viking-surface-hairline-strength, 28%),
            transparent
          ),
          transparent
        );
        pointer-events: none;
      }
      .viking-tabs-list::-webkit-scrollbar {
        display: none;
      }
      @media (min-width: 768px) {
        .viking-tabs-list {
          flex-wrap: wrap;
          overflow-x: visible;
          scroll-snap-type: none;
          -webkit-overflow-scrolling: auto;
          scrollbar-width: auto;
          overscroll-behavior-x: auto;
        }
        .viking-tabs-list::-webkit-scrollbar {
          display: block;
        }
      }
    `,
  ],
})
export class VikingTabs {
  private readonly tabComponents = contentChildren(VikingTab);

  readonly value = model<string>("");

  protected onTabKeydown = (event: KeyboardEvent): void => {
    const tabs = this.tabComponents().filter((tab) => !tab.disabled());
    if (tabs.length === 0) {
      return;
    }

    const currentIndex = tabs.findIndex((tab) => tab.value() === this.value());
    let nextIndex = currentIndex;

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        nextIndex = (currentIndex + 1) % tabs.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        break;
      case "Home":
        event.preventDefault();
        nextIndex = 0;
        break;
      case "End":
        event.preventDefault();
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    const next = tabs[nextIndex];
    this.value.set(next.value());
    const button = document.getElementById(`viking-tab-${next.value()}`);
    button?.focus();
  };
}
