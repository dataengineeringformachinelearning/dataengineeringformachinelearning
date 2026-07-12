import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";
import { VikingIcon } from "../icon/icon";
import type { VikingIconName } from "../../core/icons";
import type { VikingTone } from "../../core/types";

/** viking-metric-row — responsive grid row for HUD metric cards. */
@Component({
  selector: "viking-metric-row",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="viking-metric-row hud-metrics"><ng-content /></div>`,
})
export class VikingMetricRow {}

/** viking-metric-card — single KPI tile in a metric row. */
@Component({
  selector: "viking-metric-card",
  imports: [VikingIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    "[class]": "hostClass()",
    "[attr.aria-label]": "ariaLabel()",
    "[class.viking-metric-card-warning]": "variant() === 'warning'",
    "[class.warning]": "variant() === 'warning'",
    "[class.viking-metric-card-critical]": "variant() === 'critical'",
    "[class.critical]": "variant() === 'critical'",
  },
  template: `
    @if (icon()) {
      <viking-icon
        class="viking-metric-card-icon"
        [name]="icon()!"
        [size]="20"
        [color]="iconColor()"
        aria-hidden="true"
      />
    }
    <span class="viking-metric-card-copy">
      @if (label()) {
        <span class="viking-metric-label metric-label">{{ label() }}</span>
      }
      <span class="viking-metric-value metric-value">
        <ng-content />{{ value() }}
      </span>
      @if (sublabel()) {
        <span class="viking-metric-sublabel">{{ sublabel() }}</span>
      }
    </span>
  `,
  styles: [
    `
      :host {
        position: relative;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--viking-space-3);
        width: 100%;
        min-width: 0;
        align-self: stretch;
        height: 100%;
        min-height: var(--viking-touch-target-comfort);
        padding: var(--viking-card-padding-compact, var(--viking-space-3));
        border: 1px solid var(--viking-border-subtle);
        border-radius: var(--viking-radius-xl);
        background: var(
          --viking-surface-recipe,
          color-mix(
            in srgb,
            var(--viking-surface-alt) 74%,
            var(--viking-surface)
          )
        );
        color: var(--viking-text);
        box-sizing: border-box;
        box-shadow: var(--viking-shadow-sm);
        overflow: hidden;
        transition: var(--viking-transition-interactive);
      }

      :host::before {
        content: "";
        position: absolute;
        inset: 0 0 auto;
        height: 1px;
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

      :host:hover {
        border-color: var(--viking-border-strong);
        box-shadow: var(--viking-shadow-md);
        transform: translateY(var(--viking-state-hover-lift));
        background: var(
          --viking-surface-recipe-elevated,
          var(--viking-surface-raised)
        );
      }

      :host:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
      }

      @media (prefers-reduced-motion: reduce) {
        :host {
          transition: none;
        }
        :host:hover {
          transform: none;
        }
      }

      .viking-metric-card-icon {
        color: var(--viking-text-muted);
      }

      .viking-metric-card-copy {
        display: grid;
        gap: var(
          --viking-space-1
        ); /* Better vertical rhythm between label/value/sublabel */
        min-width: 0;
        flex: 1 1 auto;
      }

      .viking-metric-label {
        display: block;
        color: var(--viking-text-muted);
        font-size: var(--viking-font-size-2xs);
        font-weight: var(--viking-font-weight-semibold);
        letter-spacing: var(--viking-letter-spacing-caps);
        line-height: var(--viking-line-height-snug);
        text-transform: uppercase;
        margin-bottom: var(--viking-space-0-5);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .viking-metric-value {
        display: block;
        color: var(--viking-text);
        font-size: var(--viking-font-size-lg);
        font-weight: var(--viking-font-weight-bold);
        line-height: var(--viking-line-height-tight);
        font-variant-numeric: tabular-nums;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .viking-metric-sublabel {
        display: block;
        color: var(--viking-text-subtle);
        font-size: var(--viking-font-size-xs);
        line-height: var(--viking-line-height-snug);
        margin-top: var(--viking-space-0-5);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      :host(.viking-metric-card-success) .viking-metric-card-icon,
      :host(.viking-metric-card-success) .viking-metric-value {
        color: var(--viking-success);
      }

      :host(.viking-metric-card-warning) .viking-metric-card-icon,
      :host(.viking-metric-card-warning) .viking-metric-value {
        color: var(--viking-warning);
      }

      :host(.viking-metric-card-critical) .viking-metric-card-icon,
      :host(.viking-metric-card-critical) .viking-metric-value {
        color: var(--viking-danger-text);
      }

      :host(.viking-metric-card-info) .viking-metric-card-icon,
      :host(.viking-metric-card-info) .viking-metric-value {
        color: var(--viking-info);
      }
    `,
  ],
})
export class MetricCardComponent {
  readonly icon = input<VikingIconName | string | null>(null);
  readonly label = input<string>("");
  readonly value = input<string | number>("");
  readonly sublabel = input<string>("");
  readonly tone = input<VikingTone | "default">("default");
  readonly variant = input<
    "default" | "success" | "warning" | "critical" | "info"
  >("default");

  protected readonly resolvedTone = computed(() => {
    const variant = this.variant();
    if (variant !== "default") {
      return variant;
    }
    return this.tone() === "danger" ? "critical" : this.tone();
  });

  protected readonly iconColor = computed(() => {
    const tone = this.resolvedTone();
    if (tone === "critical") {
      return "danger";
    }
    return tone === "default" ? "muted" : tone;
  });

  protected readonly hostClass = computed(() => ({
    "viking-metric-card metric-card col-span-6 col-span-md-6": true,
    [`viking-metric-card-${this.resolvedTone()}`]:
      this.resolvedTone() !== "default",
  }));

  protected readonly ariaLabel = computed(() => {
    const label = this.label();
    const value = this.value();
    if (label && value !== "") {
      return `${label}: ${value}`;
    }
    return label || `${value}`;
  });
}

export { MetricCardComponent as VikingMetricCard };
