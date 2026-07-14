import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";

export type StatusBadgeVariant =
  | "operational"
  | "degraded"
  | "outage"
  | "maintenance";

const STATUS_LABELS: Record<StatusBadgeVariant, string> = {
  operational: "Operational",
  degraded: "Degraded",
  outage: "Outage",
  maintenance: "Maintenance",
};

const normalizeStatusVariant = (value: string): StatusBadgeVariant => {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "_");
  if (normalized === "operational" || normalized === "up") {
    return "operational";
  }
  if (normalized === "degraded" || normalized === "partial_outage") {
    return "degraded";
  }
  if (
    normalized === "outage" ||
    normalized === "major_outage" ||
    normalized === "down"
  ) {
    return "outage";
  }
  if (normalized === "maintenance") {
    return "maintenance";
  }
  return "operational";
};

/**
 * StatusBadgeComponent — accessible status pill with a colored dot and label.
 *
 * @example
 * ```html
 * <viking-status-badge variant="operational" />
 * <viking-status-badge variant="degraded" label="Partial outage" />
 * ```
 */
@Component({
  selector: "viking-status-badge",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: "status",
    "[class]": "hostClass()",
    "[attr.aria-label]": "ariaLabel()",
  },
  template: `
    <span class="viking-status-badge-dot" aria-hidden="true"></span>
    <span class="viking-status-badge-label">{{ resolvedLabel() }}</span>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--viking-space-1);
        width: fit-content;
        max-width: 100%;
        padding: var(--viking-space-0-5) var(--viking-space-2);
        border: 1px solid var(--viking-border);
        border-radius: var(--viking-radius-pill);
        background: var(--viking-surface-alt);
        color: var(--viking-text);
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size-xs);
        font-weight: var(--viking-font-weight-semibold);
        letter-spacing: var(--viking-letter-spacing-wide);
        line-height: var(--viking-line-height-snug);
        white-space: nowrap;
        box-shadow: var(--viking-shadow-xs);
      }

      .viking-status-badge-dot {
        width: var(--viking-space-1);
        height: var(--viking-space-1);
        border-radius: var(--viking-radius-full);
        background: currentColor;
        box-shadow: 0 0 0 var(--viking-space-0-5)
          color-mix(in srgb, currentColor 12%, transparent);
        flex: 0 0 auto;
      }

      .viking-status-badge-label {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        color: var(--viking-text);
      }

      :host(.viking-status-badge-operational) {
        color: var(--viking-success);
        border-color: color-mix(
          in srgb,
          var(--viking-success) 48%,
          var(--viking-border)
        );
        background: color-mix(
          in srgb,
          var(--viking-success) 12%,
          var(--viking-surface)
        );
      }

      :host(.viking-status-badge-degraded),
      :host(.viking-status-badge-maintenance) {
        color: var(--viking-warning);
        border-color: color-mix(
          in srgb,
          var(--viking-warning) 52%,
          var(--viking-border)
        );
        background: color-mix(
          in srgb,
          var(--viking-warning) 14%,
          var(--viking-surface)
        );
      }

      :host(.viking-status-badge-outage) {
        color: var(--viking-danger-text);
        border-color: color-mix(
          in srgb,
          var(--viking-danger) 58%,
          var(--viking-border)
        );
        background: color-mix(
          in srgb,
          var(--viking-danger) 16%,
          var(--viking-surface)
        );
      }
    `,
  ],
})
export class StatusBadgeComponent {
  readonly variant = input<StatusBadgeVariant | string>("operational");
  readonly label = input<string>("");
  readonly aria = input<string>("");

  protected readonly normalizedVariant = computed(() =>
    normalizeStatusVariant(this.variant()),
  );

  protected readonly resolvedLabel = computed(
    () => this.label() || STATUS_LABELS[this.normalizedVariant()],
  );

  protected readonly ariaLabel = computed(
    () => this.aria() || `System status: ${this.resolvedLabel()}`,
  );

  protected readonly hostClass = computed(
    () => `viking-status-badge viking-status-badge-${this.normalizedVariant()}`,
  );
}

export { StatusBadgeComponent as VikingStatusBadge };
