import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * viking-page-header — unified HUD / topbar header for dashboard pages.
 */
@Component({
  selector: 'viking-page-header',
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
        <ng-content select="[fluxPageHeaderBack]" />
        @if (tag()) {
          <div class="section-tag-row">
            <span class="section-tag viking-page-header-tag">{{ tag() }}</span>
          </div>
        }
        <h1 class="viking-page-header-title hud-title page-title">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="viking-page-header-subtitle hud-subtitle page-description">{{ subtitle() }}</p>
        }
        <ng-content select="[fluxPageHeaderExtra]" />
      </div>
      <div class="viking-page-header-actions topbar-right">
        <ng-content select="[fluxPageHeaderActions]" />
      </div>
    </header>
  `,
})
export class VikingPageHeader {
  readonly tag = input<string>('');
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly layout = input<'hud' | 'sidebar'>('hud');
}
