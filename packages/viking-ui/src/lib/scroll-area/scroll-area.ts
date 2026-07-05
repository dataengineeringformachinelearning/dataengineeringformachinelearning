import { ChangeDetectionStrategy, Component, input } from "@angular/core";

/**
 * viking-scroll-area — constrained scroll region with clinical scrollbar styling.
 */
@Component({
  selector: "viking-scroll-area",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: "viking-scroll-area",
    "[style.max-height]": "maxHeight()",
    "[style.max-width]": "maxWidth()",
  },
  template: `<div class="viking-scroll-area-viewport" tabindex="0">
    <ng-content />
  </div>`,
  styles: [
    `
      :host {
        display: block;
        overflow: hidden;
        border: 1px solid var(--viking-border);
        border-radius: var(--viking-radius);
        background: var(--viking-surface);
      }
      .viking-scroll-area-viewport {
        max-height: inherit;
        overflow: auto;
        padding: var(--viking-space-2);
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size);
        color: var(--viking-text);
        scrollbar-width: thin;
        scrollbar-color: var(--viking-accent-strong) var(--viking-surface-alt);
      }
      .viking-scroll-area-viewport:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: calc(-1 * var(--viking-ring-offset));
      }
      .viking-scroll-area-viewport::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      .viking-scroll-area-viewport::-webkit-scrollbar-thumb {
        background: var(--viking-accent-strong);
        border-radius: var(--viking-radius-pill);
      }
      .viking-scroll-area-viewport::-webkit-scrollbar-track {
        background: var(--viking-surface-alt);
      }
    `,
  ],
})
export class VikingScrollArea {
  readonly maxHeight = input<string>("240px");
  readonly maxWidth = input<string>("100%");
}
