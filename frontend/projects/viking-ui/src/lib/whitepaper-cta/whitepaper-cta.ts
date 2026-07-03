import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { VikingBar } from '../bar/bar';
import { VikingButton } from '../button/button';
import { VikingChart } from '../chart/chart';
import { VikingChartSeries } from '../core/types';

/**
 * viking-whitepaper-cta — Polars-style animated research CTA with bar grid + sparkline.
 */
@Component({
  selector: 'viking-whitepaper-cta',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [VikingBar, VikingButton, VikingChart],
  template: `
    <section class="viking-whitepaper-cta" [attr.aria-labelledby]="headingId">
      <div class="viking-whitepaper-cta-bg" aria-hidden="true">
        <div class="viking-whitepaper-polars-grid">
          @for (bar of barHeights; track $index) {
            <viking-bar class="viking-whitepaper-polars-bar" [height]="bar" />
          }
        </div>
        <viking-chart
          kind="sparkline"
          [series]="sparklineSeries"
          label="Research activity trend"
          class="viking-whitepaper-sparkline viking-chart-wide"
        />
      </div>

      <div class="viking-whitepaper-cta-content">
        <span class="viking-whitepaper-tag">{{ tag() }}</span>
        <h2 [id]="headingId" class="viking-whitepaper-title">{{ title() }}</h2>
        <p class="viking-whitepaper-description">{{ description() }}</p>
        <viking-button
          variant="primary"
          [href]="href()"
          [attr.target]="external() ? '_blank' : null"
          [attr.rel]="external() ? 'noopener noreferrer' : null"
          icon="file"
          class="viking-whitepaper-btn"
        >
          {{ buttonLabel() }}
        </viking-button>
      </div>
    </section>
  `,
  styleUrl: './whitepaper-cta.scss',
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
    `,
  ],
})
export class VikingWhitepaperCta {
  readonly tag = input('Research & Architecture');
  readonly title = input('The Whitepaper');
  readonly description = input(
    'Event projection patterns, threat mitigation algorithms, and the architecture powering symmetrical multi-tenant pipelines.',
  );
  readonly buttonLabel = input('Read Whitepaper');
  readonly href = input('/whitepaper');
  readonly external = input(false);

  protected readonly headingId = 'viking-whitepaper-cta-title';
  protected readonly barHeights = [72, 45, 88, 56, 91, 38, 67, 82, 49, 76, 58, 94];
  protected readonly sparklineSeries: VikingChartSeries[] = [
    { name: 'Research', tone: 'accent', data: [12, 18, 15, 22, 28, 24, 32, 35, 30, 38, 42, 45] },
  ];
}
