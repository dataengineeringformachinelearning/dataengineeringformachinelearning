import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Params } from '@angular/router';
import { VikingPageBackLink } from '../page-back-link/page-back-link';

/**
 * viking-page-header — unified HUD page title block (tag, title, subtitle) with
 * optional back navigation and action slots.
 */
@Component({
  selector: 'viking-page-header',
  imports: [VikingPageBackLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.viking-page-header-sidebar]': "layout() === 'sidebar'",
  },
  template: `
    <header
      class="viking-page-header"
      [class.dashboard-topbar]="layout() === 'sidebar'"
      [class.hud-header]="layout() === 'hud'"
    >
      <div class="viking-page-header-main title-group topbar-left">
        @if (backTo()) {
          <viking-page-back-link
            [route]="backTo()!"
            [queryParams]="backQueryParams()"
            [label]="backLabel()"
            [navLabel]="backNavLabel()"
          />
        } @else {
          <ng-content select="[vikingPageHeaderBack]" />
        }

        <div class="viking-page-header-title-block">
          @if (tag()) {
            <div class="section-tag-row">
              <span class="section-tag viking-page-header-tag">{{ tag() }}</span>
            </div>
          }
          <h1 class="viking-page-header-title hud-title page-title">{{ title() }}</h1>
          @if (subtitle()) {
            <p class="viking-page-header-subtitle hud-subtitle page-description">
              {{ subtitle() }}
            </p>
          }
          <ng-content select="[vikingPageHeaderExtra]" />
        </div>
      </div>
      <div class="viking-page-header-actions topbar-right">
        <ng-content select="[vikingPageHeaderActions]" />
      </div>
    </header>
  `,
})
export class VikingPageHeader {
  readonly tag = input<string>('');
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly layout = input<'hud' | 'sidebar'>('hud');
  readonly backTo = input<string | readonly string[] | null>(null);
  readonly backQueryParams = input<Params | null>(null);
  readonly backLabel = input<string>('Back to Dashboard');
  readonly backNavLabel = input<string>('Return to dashboard');
}
