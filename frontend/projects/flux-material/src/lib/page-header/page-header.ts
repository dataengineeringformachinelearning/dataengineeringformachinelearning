import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * flux-page-header — unified HUD / topbar header for dashboard pages.
 */
@Component({
  selector: 'flux-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.flux-page-header-sidebar]': "layout() === 'sidebar'",
  },
  template: `
    <header
      class="flux-page-header"
      [class.dashboard-topbar]="layout() === 'sidebar'"
      [class.hud-header]="layout() === 'hud'"
    >
      <div class="flux-page-header-main title-group topbar-left">
        <ng-content select="[fluxPageHeaderBack]" />
        @if (tag()) {
          <div class="section-tag-row">
            <span class="section-tag flux-page-header-tag">{{ tag() }}</span>
          </div>
        }
        <h1 class="flux-page-header-title hud-title page-title">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="flux-page-header-subtitle hud-subtitle page-description">{{ subtitle() }}</p>
        }
        <ng-content select="[fluxPageHeaderExtra]" />
      </div>
      <div class="flux-page-header-actions topbar-right">
        <ng-content select="[fluxPageHeaderActions]" />
      </div>
    </header>
  `,
})
export class FluxPageHeader {
  readonly tag = input<string>('');
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly layout = input<'hud' | 'sidebar'>('hud');
}
