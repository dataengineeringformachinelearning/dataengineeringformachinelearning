import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";
import {
  StatusBadgeComponent,
  type StatusBadgeVariant,
} from "../status-badge/status-badge";

/**
 * StatusSectionComponent — full-width status page surface with section dividers.
 *
 * Use this as the outer status dashboard/card. Project content with the
 * package-owned utility classes below to avoid nested cards:
 *
 * ```html
 * <viking-status-section title="joealongi" status="operational" statusLabel="Operational">
 *   <div class="viking-status-section-block">...</div>
 *   <div class="viking-status-section-grid">...</div>
 * </viking-status-section>
 * ```
 */
@Component({
  selector: "viking-status-section",
  imports: [StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: "viking-status-section",
    "[attr.aria-label]": "ariaLabel()",
  },
  template: `
    <section class="viking-status-section-shell">
      <header class="viking-status-section-hero">
        <div class="viking-status-section-hero-copy">
          <viking-status-badge
            [variant]="status()"
            [label]="statusLabel()"
            [aria]="statusAria()"
          />
          <div class="viking-status-section-title-row">
            <h2 class="viking-status-section-title">{{ title() }}</h2>
            <ng-content select="[statusSectionTitleMeta]" />
          </div>
          @if (description()) {
            <p class="viking-status-section-description">{{ description() }}</p>
          }
        </div>
        @if (liveLabel()) {
          <div class="viking-status-section-live" role="status">
            <span
              class="viking-status-section-live-dot"
              aria-hidden="true"
            ></span>
            {{ liveLabel() }}
          </div>
        }
        <ng-content select="[statusSectionActions]" />
      </header>

      <div class="viking-status-section-content">
        <ng-content />
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        min-width: 0;
        color: var(--viking-text);
      }

      .viking-status-section-shell {
        display: grid;
        gap: 0;
        width: 100%;
        min-width: 0;
        border: 1px solid var(--viking-border);
        border-radius: var(--viking-radius-lg);
        background: var(--viking-surface-recipe, var(--viking-surface));
        box-shadow: var(--viking-shadow-sm);
        overflow: hidden;
      }

      .viking-status-section-hero {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--viking-space-3);
        padding: var(--viking-space-4);
        border-bottom: 1px solid var(--viking-border);
        background: color-mix(
          in srgb,
          var(--viking-surface-alt) 54%,
          transparent
        );
      }

      .viking-status-section-hero-copy {
        display: grid;
        gap: var(--viking-space-2);
        min-width: min(100%, var(--viking-content-readable-max-width));
        flex: 1 1 min(100%, var(--viking-content-readable-max-width));
      }

      .viking-status-section-title-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--viking-space-2);
        min-width: 0;
      }

      .viking-status-section-title {
        margin: 0;
        color: var(--viking-text);
        font-size: var(--viking-font-size-2xl);
        font-weight: var(--viking-font-weight-bold);
        line-height: var(--viking-line-height-tight);
      }

      .viking-status-section-description {
        margin: 0;
        color: var(--viking-text-muted);
        font-size: var(--viking-font-size);
        line-height: var(--viking-line-height-relaxed);
        max-width: var(--viking-content-readable-max-width);
      }

      .viking-status-section-live {
        display: inline-flex;
        align-items: center;
        gap: var(--viking-space-1);
        min-height: var(--viking-touch-target-comfort);
        padding: var(--viking-space-1) var(--viking-space-2);
        border-radius: var(--viking-radius-pill);
        border: 1px solid var(--viking-border-subtle);
        background: color-mix(
          in srgb,
          var(--viking-accent) 10%,
          var(--viking-surface)
        );
        color: var(--viking-accent-strong);
        font-size: var(--viking-font-size-xs);
        font-weight: var(--viking-font-weight-semibold);
        letter-spacing: var(--viking-letter-spacing-caps);
        line-height: var(--viking-line-height-snug);
        text-transform: uppercase;
      }

      .viking-status-section-live-dot {
        width: var(--viking-space-1);
        height: var(--viking-space-1);
        border-radius: var(--viking-radius-full);
        background: var(--viking-accent);
        box-shadow: 0 0 0 var(--viking-space-0-5)
          color-mix(in srgb, var(--viking-accent) 14%, transparent);
      }

      .viking-status-section-content {
        display: grid;
        min-width: 0;
      }

      .viking-status-section-content ::ng-deep > * {
        min-width: 0;
      }

      .viking-status-section-content ::ng-deep .viking-status-section-block {
        display: grid;
        gap: var(--viking-space-6);
        padding: var(--viking-space-5);
        border-top: 1px solid var(--viking-border-subtle);
      }

      /* System chart breathing — consistent with viking-chart-panel + premium spacing */
      .viking-status-section-content ::ng-deep viking-chart {
        margin: var(--viking-space-2) 0 var(--viking-space-1);
      }

      .viking-status-section-content
        ::ng-deep
        .viking-status-section-block:first-child {
        border-top: 0;
      }

      .viking-status-section-content ::ng-deep .viking-status-section-heading {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--viking-space-2);
        margin: 0 0 var(--viking-space-2) 0;
        color: var(--viking-text);
        font-size: var(--viking-font-size-lg);
        font-weight: var(--viking-font-weight-bold);
        line-height: var(--viking-line-height-tight);
      }

      .viking-status-section-content ::ng-deep .viking-status-section-subtitle {
        margin: 0 0 var(--viking-space-2) 0;
        color: var(--viking-text-muted);
        font-size: var(--viking-font-size-sm);
        line-height: var(--viking-line-height-relaxed);
      }

      .viking-status-section-content ::ng-deep .viking-status-section-grid,
      .viking-status-section-content ::ng-deep .viking-status-section-metrics {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: var(--viking-space-5);
        width: 100%;
      }

      .viking-status-section-content ::ng-deep .viking-status-section-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--viking-space-2);
        width: 100%;
        min-width: 0;
      }

      .viking-status-section-content ::ng-deep .viking-status-service-list {
        display: grid;
        gap: var(--viking-space-5);
        width: 100%;
      }

      .viking-status-section-content ::ng-deep .viking-status-service {
        display: grid;
        gap: var(--viking-space-4);
        padding: var(--viking-space-4) 0;
        border-top: 1px solid var(--viking-border-subtle);
      }

      .viking-status-section-content
        ::ng-deep
        .viking-status-service:first-child {
        border-top: 0;
        padding-top: 0;
      }

      /* md breakpoint: 2-col for grids, start 2-col for dense metrics */
      @media (min-width: 768px) {
        .viking-status-section-content ::ng-deep .viking-status-section-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: var(--viking-space-5);
        }

        .viking-status-section-content
          ::ng-deep
          .viking-status-section-metrics {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: var(--viking-space-5);
        }
      }

      @media (min-width: 1024px) {
        .viking-status-section-content
          ::ng-deep
          .viking-status-section-metrics {
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: var(--viking-space-6);
        }
      }

      @media (max-width: 767px) {
        .viking-status-section-hero,
        .viking-status-section-content ::ng-deep .viking-status-section-block {
          padding: var(--viking-space-4);
          gap: var(--viking-space-4);
        }

        .viking-status-section-title {
          font-size: var(--viking-font-size-xl);
        }
      }
    `,
  ],
})
export class StatusSectionComponent {
  readonly title = input.required<string>();
  readonly description = input<string>("");
  readonly status = input<StatusBadgeVariant | string>("operational");
  readonly statusLabel = input<string>("");
  readonly statusAria = input<string>("");
  readonly liveLabel = input<string>("");

  protected readonly ariaLabel = computed(
    () => `${this.title()} status overview`,
  );
}

export { StatusSectionComponent as VikingStatusSection };
