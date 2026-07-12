import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  signal,
} from "@angular/core";
import { VikingIcon } from "../icon/icon";

export type VikingHelpPanelVariant = "default" | "compact";

/**
 * viking-help-panel — contextual documentation and onboarding panel.
 * Based on Cloudscape Help Panel pattern, adapted for Viking-UI.
 * Used for inline docs, feature explanations, and onboarding tooltips.
 */
@Component({
  selector: "viking-help-panel",
  standalone: true,
  imports: [VikingIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="viking-help-panel">
      <header class="viking-help-panel__header">
        @if (icon()) {
          <viking-icon
            class="viking-help-panel__icon"
            [name]="icon()!"
            [size]="20"
          />
        }
        <h2 class="viking-help-panel__title">{{ heading() }}</h2>
        @if (dismissible()) {
          <button
            type="button"
            class="viking-help-panel__dismiss"
            aria-label="Dismiss help"
            (click)="dismissed.set(true)"
          >
            <viking-icon name="x" [size]="16" />
          </button>
        }
      </header>
      <div class="viking-help-panel__body">
        <ng-content />
      </div>
    </div>
  `,
  styles: [
    `
      :host(.viking-help-panel-wrapper) {
        display: block;
      }
      .viking-help-panel {
        display: flex;
        flex-direction: column;
        border: 1px solid var(--viking-border);
        border-radius: var(--viking-radius);
        background: var(--viking-surface);
        font-family: var(--viking-font-family);
      }
      .viking-help-panel__header {
        display: flex;
        align-items: flex-start;
        gap: var(--viking-space-2);
        padding: var(--viking-space-2);
        border-bottom: 1px solid var(--viking-border);
        flex-shrink: 0;
      }
      .viking-help-panel__icon {
        color: var(--viking-accent);
        flex-shrink: 0;
        margin-top: var(--viking-space-0-5);
      }
      .viking-help-panel__title {
        margin: 0;
        flex: 1;
        font-size: var(--viking-font-size-ui);
        font-weight: var(--viking-font-weight-bold);
        letter-spacing: var(--viking-letter-spacing-tight);
        color: var(--viking-text);
      }
      .viking-help-panel__dismiss {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: var(--viking-control-height-sm);
        height: var(--viking-control-height-sm);
        border: none;
        background: transparent;
        color: var(--viking-text-muted);
        cursor: pointer;
        padding: 0;
        border-radius: var(--viking-radius);
        transition: var(--viking-transition-interactive);
      }
      .viking-help-panel__dismiss:hover {
        color: var(--viking-text);
        background: var(--viking-accent-soft);
      }
      .viking-help-panel__dismiss:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset-tight);
      }
      .viking-help-panel__body {
        flex: 1;
        overflow: auto;
        padding: var(--viking-space-2);
        font-size: var(--viking-font-size);
        color: var(--viking-text-muted);
        line-height: var(--viking-line-height-relaxed);
      }
      .viking-help-panel__body h3 {
        margin: var(--viking-space-3) 0 var(--viking-space-1);
        font-size: var(--viking-font-size-sm);
        font-weight: var(--viking-font-weight-semibold);
        color: var(--viking-text);
        letter-spacing: var(--viking-letter-spacing-wide);
        text-transform: uppercase;
      }
      .viking-help-panel__body p {
        margin: 0 0 var(--viking-space-1);
      }
      .viking-help-panel__body ul {
        margin: 0 0 var(--viking-space-2);
        padding-left: var(--viking-space-3);
      }
      .viking-help-panel__body li {
        margin-bottom: var(--viking-space-0-5);
      }
      .viking-help-panel--compact .viking-help-panel__header {
        padding: var(--viking-space-1);
      }
      .viking-help-panel--compact .viking-help-panel__body {
        padding: var(--viking-space-1);
      }
    `,
  ],
})
export class VikingHelpPanel {
  readonly heading = input<string>("");
  readonly icon = input<string | null>(null);
  readonly dismissible = input<boolean>(true);
  readonly variant = input<VikingHelpPanelVariant>("default");

  protected readonly dismissed = signal(false);

  protected readonly hostClass = computed(() =>
    ["viking-help-panel-wrapper", `viking-help-panel--${this.variant()}`].join(
      " ",
    ),
  );
}
