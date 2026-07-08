import { ChangeDetectionStrategy, Component, input } from "@angular/core";

/**
 * viking-app-header — sticky application header with brand, nav, actions, and mobile menu slots.
 * Styles live in the component library so all apps share one navbar implementation.
 */
@Component({
  selector: "viking-app-header",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="viking-app-header">
      <div class="viking-app-header-content">
        <div class="viking-app-header-left">
          <ng-content select="[vikingAppHeaderBrand]" />
        </div>
        <nav
          class="viking-app-header-center viking-app-header-desktop-nav"
          aria-label="Main navigation"
        >
          <ng-content select="[vikingAppHeaderNav]" />
        </nav>
        <div class="viking-app-header-right">
          <div class="viking-app-header-desktop-auth">
            <ng-content select="[vikingAppHeaderAuth]" />
          </div>
          <div class="viking-app-header-actions">
            <ng-content select="[vikingAppHeaderActions]" />
          </div>
        </div>
      </div>
      <nav
        class="viking-app-header-mobile"
        [class.viking-open]="mobileMenuOpen()"
        [attr.aria-label]="mobileMenuLabel()"
      >
        <ng-content select="[vikingAppHeaderMobile]" />
      </nav>
    </header>
  `,
  styleUrl: "./app-header.scss",
})
export class VikingAppHeader {
  readonly mobileMenuOpen = input<boolean>(false);
  readonly mobileMenuLabel = input<string>("Mobile navigation");
}
