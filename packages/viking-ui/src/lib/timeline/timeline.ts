import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { VikingIcon } from "../icon/icon";
import { VikingIconName } from "../../core/icons";
import { VikingTone } from "../../core/types";

/**
 * viking-timeline — vertical event feed.
 * Compose with viking-timeline-item.
 */
@Component({
  selector: "viking-timeline",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: "list" },
  template: `<ng-content />`,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
      }
    `,
  ],
})
export class VikingTimeline {}

/** A single event on viking-timeline. */
@Component({
  selector: "viking-timeline-item",
  imports: [VikingIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: "listitem" },
  template: `
    <div class="viking-timeline-item">
      <div class="viking-timeline-rail" aria-hidden="true">
        <span
          class="viking-timeline-marker"
          [class]="'viking-marker-' + tone()"
        >
          @if (icon()) {
            <viking-icon [name]="icon()!" [size]="14" />
          }
        </span>
        <span class="viking-timeline-line"></span>
      </div>
      <div class="viking-timeline-content">
        <div class="viking-timeline-header">
          <span class="viking-timeline-heading">{{ heading() }}</span>
          @if (timestamp()) {
            <time class="viking-timeline-time">{{ timestamp() }}</time>
          }
        </div>
        <div class="viking-timeline-body"><ng-content /></div>
      </div>
    </div>
  `,
  styles: [
    `
      :host:last-child .viking-timeline-line {
        display: none;
      }
      .viking-timeline-item {
        display: flex;
        gap: var(--viking-space-2);
        font-family: var(--viking-font-family);
      }
      .viking-timeline-rail {
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .viking-timeline-marker {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: var(--viking-space-3);
        height: var(--viking-space-3);
        border-radius: var(--viking-radius-pill);
        border: 2px solid var(--viking-border-strong);
        background: var(--viking-surface);
        color: var(--viking-text-muted);
        flex-shrink: 0;
      }
      .viking-marker-accent {
        border-color: var(--viking-accent);
        color: var(--viking-accent);
      }
      .viking-marker-secondary {
        border-color: var(--viking-accent-secondary);
        color: var(--viking-accent-secondary);
      }
      .viking-marker-info {
        border-color: var(--viking-info);
        color: var(--viking-info);
      }
      .viking-marker-success {
        border-color: var(--viking-success);
        color: var(--viking-success);
      }
      .viking-marker-warning {
        border-color: var(--viking-warning);
        color: var(--viking-text);
      }
      .viking-marker-danger {
        border-color: var(--viking-danger);
        color: var(--viking-danger);
      }
      .viking-timeline-line {
        flex: 1;
        width: 2px;
        min-height: var(--viking-space-2);
        background: var(--viking-border);
      }
      .viking-timeline-content {
        flex: 1;
        padding-bottom: var(--viking-space-3);
        min-width: 0;
      }
      .viking-timeline-header {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: var(--viking-space-2);
        flex-wrap: wrap;
      }
      .viking-timeline-heading {
        font-size: var(--viking-font-size);
        font-weight: 600;
        color: var(--viking-text);
      }
      .viking-timeline-time {
        font-size: var(--viking-font-size);
        color: var(--viking-text-muted);
        font-variant-numeric: tabular-nums;
      }
      .viking-timeline-body {
        margin-top: 3px;
        font-size: var(--viking-font-size);
        color: var(--viking-text-muted);
        line-height: 1.55;
      }
      .viking-timeline-body:empty {
        display: none;
      }
    `,
  ],
})
export class VikingTimelineItem {
  readonly heading = input.required<string>();
  readonly timestamp = input<string>("");
  readonly icon = input<VikingIconName | null>(null);
  readonly tone = input<VikingTone>("muted");
}
