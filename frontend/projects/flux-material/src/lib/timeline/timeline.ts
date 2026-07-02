import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FluxIcon } from '../icon/icon';
import { FluxIconName } from '../core/icons';
import { FluxTone } from '../core/types';

/**
 * flux-timeline — vertical event feed (https://fluxui.dev/components/timeline).
 * Compose with flux-timeline-item.
 */
@Component({
  selector: 'flux-timeline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'list' },
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
export class FluxTimeline {}

/** A single event on flux-timeline. */
@Component({
  selector: 'flux-timeline-item',
  imports: [FluxIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'listitem' },
  template: `
    <div class="flux-timeline-item">
      <div class="flux-timeline-rail" aria-hidden="true">
        <span class="flux-timeline-marker" [class]="'flux-marker-' + tone()">
          @if (icon()) {
            <flux-icon [name]="icon()!" [size]="14" />
          }
        </span>
        <span class="flux-timeline-line"></span>
      </div>
      <div class="flux-timeline-content">
        <div class="flux-timeline-header">
          <span class="flux-timeline-heading">{{ heading() }}</span>
          @if (timestamp()) {
            <time class="flux-timeline-time">{{ timestamp() }}</time>
          }
        </div>
        <div class="flux-timeline-body"><ng-content /></div>
      </div>
    </div>
  `,
  styles: [
    `
      :host:last-child .flux-timeline-line {
        display: none;
      }
      .flux-timeline-item {
        display: flex;
        gap: var(--flux-space-2);
        font-family: var(--flux-font-family);
      }
      .flux-timeline-rail {
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .flux-timeline-marker {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: var(--flux-space-3);
        height: var(--flux-space-3);
        border-radius: var(--flux-radius-pill);
        border: 2px solid var(--flux-border-strong);
        background: var(--flux-surface);
        color: var(--flux-text-muted);
        flex-shrink: 0;
      }
      .flux-marker-accent {
        border-color: var(--flux-accent);
        color: var(--flux-accent);
      }
      .flux-marker-success {
        border-color: var(--flux-success);
        color: var(--flux-success);
      }
      .flux-marker-warning {
        border-color: var(--flux-warning);
        color: var(--flux-text);
      }
      .flux-marker-danger {
        border-color: var(--flux-danger);
        color: var(--flux-danger);
      }
      .flux-timeline-line {
        flex: 1;
        width: 2px;
        min-height: var(--flux-space-2);
        background: var(--flux-border);
      }
      .flux-timeline-content {
        flex: 1;
        padding-bottom: var(--flux-space-3);
        min-width: 0;
      }
      .flux-timeline-header {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: var(--flux-space-2);
        flex-wrap: wrap;
      }
      .flux-timeline-heading {
        font-size: var(--flux-font-size);
        font-weight: 600;
        color: var(--flux-text);
      }
      .flux-timeline-time {
        font-size: var(--flux-font-size);
        color: var(--flux-text-muted);
        font-variant-numeric: tabular-nums;
      }
      .flux-timeline-body {
        margin-top: 3px;
        font-size: var(--flux-font-size);
        color: var(--flux-text-muted);
        line-height: 1.55;
      }
      .flux-timeline-body:empty {
        display: none;
      }
    `,
  ],
})
export class FluxTimelineItem {
  readonly heading = input.required<string>();
  readonly timestamp = input<string>('');
  readonly icon = input<FluxIconName | null>(null);
  readonly tone = input<FluxTone>('muted');
}
