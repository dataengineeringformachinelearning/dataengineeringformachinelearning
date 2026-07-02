import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * flux-app-header — sticky application header with brand, nav, actions, and mobile menu slots.
 * Styles live in the component library so all apps share one navbar implementation.
 */
@Component({
  selector: 'flux-app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="flux-app-header">
      <div class="flux-app-header-content">
        <div class="flux-app-header-left">
          <ng-content select="[fluxAppHeaderBrand]" />
        </div>
        <nav
          class="flux-app-header-center flux-app-header-desktop-nav"
          aria-label="Main navigation"
        >
          <ng-content select="[fluxAppHeaderNav]" />
        </nav>
        <div class="flux-app-header-right">
          <div class="flux-app-header-desktop-auth">
            <ng-content select="[fluxAppHeaderAuth]" />
          </div>
          <ng-content select="[fluxAppHeaderActions]" />
        </div>
      </div>
      <nav
        class="flux-app-header-mobile"
        [class.flux-open]="mobileMenuOpen()"
        [attr.aria-label]="mobileMenuLabel()"
      >
        <ng-content select="[fluxAppHeaderMobile]" />
      </nav>
    </header>
  `,
  styleUrl: './app-header.scss',
})
export class FluxAppHeader {
  readonly mobileMenuOpen = input<boolean>(false);
  readonly mobileMenuLabel = input<string>('Mobile navigation');
}
