import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  input,
  output,
  signal,
} from "@angular/core";
import { RouterLink, RouterLinkActive } from "@angular/router";
import { VikingButton } from "../button/button";
import { VikingIcon } from "../icon/icon";
import { VikingThemeToggle } from "../theme-toggle/theme-toggle";
import {
  DEFAULT_SITE_URLS,
  isAppRouterPath,
  resolveBrandHref,
  resolveNavHref,
  SITE_NAV_LINKS,
  SiteDrakkarContext,
  SiteUrls,
  visibleNavLinks,
} from "./site-drakkar.config";

/**
 * viking-site-navbar — canonical site header shared across DEML surfaces.
 * Uses `.navbar` markup + viking-ui.css (same structure as marketing/backend static HTML).
 */
@Component({
  selector: "viking-site-navbar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [
    RouterLink,
    RouterLinkActive,
    VikingButton,
    VikingIcon,
    VikingThemeToggle,
  ],
  styleUrl: "./site-navbar.scss",
  template: `
    <header class="navbar">
      <div class="navbar-content">
        <div class="navbar-left">
          @if (context() === "app") {
            <a
              [href]="brandHref()"
              class="navbar-brand"
              aria-label="Go to marketing homepage"
              (click)="onBrandClick($event)"
            >
              <viking-icon
                name="drakkar"
                [size]="28"
                color="accent"
                class="brand-icon navbar-logo"
              />
            </a>
          } @else {
            <a
              [href]="brandHref()"
              class="navbar-brand"
              aria-label="Go to homepage"
            >
              <viking-icon
                name="drakkar"
                [size]="28"
                color="accent"
                class="brand-icon navbar-logo"
              />
            </a>
          }
        </div>

        <nav class="navbar-center desktop-nav" aria-label="Main navigation">
          @for (link of navLinks(); track link.id) {
            @if (context() === "app" && isAppRouterPath(link.appHref)) {
              <a
                [routerLink]="link.appHref"
                routerLinkActive="active"
                [routerLinkActiveOptions]="{
                  exact: link.appHref === '/explore',
                }"
                class="nav-btn"
              >
                <viking-icon [name]="link.icon" [size]="16" />
                <span>{{ link.label }}</span>
              </a>
            } @else {
              <a [href]="resolveHref(link)" class="nav-btn">
                <viking-icon [name]="link.icon" [size]="16" />
                <span>{{ link.label }}</span>
              </a>
            }
          }
        </nav>

        <div class="navbar-right">
          @if (showSearch()) {
            <div class="navbar-search" role="search">
              <viking-button
                variant="outline"
                [square]="true"
                [compact]="true"
                icon="search"
                label="Open search (⌘K)"
                (pressed)="openSearch()"
              />
            </div>
          }

          <div class="desktop-auth">
            @if (!isAuthenticated()) {
              <viking-button
                variant="primary"
                icon="arrow-right"
                class="auth-btn"
                [loading]="isBusy()"
                (pressed)="login.emit()"
              >
                Sign In
              </viking-button>
            } @else {
              <viking-button
                variant="primary"
                icon="home"
                class="auth-btn"
                [href]="urls().app + '/dashboard'"
              >
                Dashboard
              </viking-button>
              <viking-button
                variant="ghost"
                class="auth-btn auth-signout-btn"
                [loading]="isBusy()"
                (pressed)="logout.emit()"
                >Sign Out</viking-button
              >
            }
          </div>

          <viking-theme-toggle
            [theme]="theme()"
            (toggle)="themeToggle.emit()"
          />

          <viking-button
            variant="outline"
            [square]="true"
            class="menu-toggle-btn"
            [icon]="mobileMenuOpen() ? 'x' : 'menu'"
            [label]="
              mobileMenuOpen()
                ? 'Close navigation menu'
                : 'Toggle navigation menu'
            "
            (pressed)="toggleMobileMenu()"
          />
        </div>
      </div>

      <nav
        class="mobile-menu"
        [class.open]="mobileMenuOpen()"
        aria-label="Mobile navigation"
      >
        @for (link of navLinks(); track link.id + "-mobile") {
          @if (context() === "app" && isAppRouterPath(link.appHref)) {
            <a
              [routerLink]="link.appHref"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: link.appHref === '/explore' }"
              class="mobile-nav-btn"
              (click)="closeMobileMenu()"
            >
              <viking-icon [name]="link.icon" [size]="16" />
              <span>{{ link.label }}</span>
            </a>
          } @else {
            <a
              [href]="resolveHref(link)"
              class="mobile-nav-btn"
              (click)="closeMobileMenu()"
            >
              <viking-icon [name]="link.icon" [size]="16" />
              <span>{{ link.label }}</span>
            </a>
          }
        }

        <div class="mobile-divider"></div>

        @if (!isAuthenticated()) {
          <viking-button
            variant="primary"
            icon="arrow-right"
            class="mobile-auth-btn auth-btn"
            [loading]="isBusy()"
            [fullWidth]="true"
            (pressed)="login.emit(); closeMobileMenu()"
          >
            Sign In
          </viking-button>
        } @else {
          <viking-button
            variant="primary"
            icon="home"
            class="mobile-auth-btn auth-btn"
            [fullWidth]="true"
            [href]="urls().app + '/dashboard'"
            (pressed)="closeMobileMenu()"
          >
            Dashboard
          </viking-button>
          <viking-button
            variant="ghost"
            class="mobile-auth-btn auth-btn auth-signout-btn"
            [loading]="isBusy()"
            [fullWidth]="true"
            (pressed)="logout.emit(); closeMobileMenu()"
          >
            Sign Out
          </viking-button>
        }
      </nav>
    </header>
  `,
})
export class VikingSiteNavbar {
  readonly context = input<SiteDrakkarContext>("app");
  readonly urls = input<SiteUrls>(DEFAULT_SITE_URLS);
  readonly isAuthenticated = input<boolean>(false);
  readonly isBusy = input<boolean>(false);
  readonly theme = input<"light" | "dark">("dark");
  readonly showSearch = input<boolean>(false);

  readonly login = output<void>();
  readonly logout = output<void>();
  readonly themeToggle = output<void>();
  readonly searchOpen = output<void>();

  protected readonly mobileMenuOpen = signal(false);

  protected readonly navLinks = computed(() =>
    visibleNavLinks(SITE_NAV_LINKS, this.isAuthenticated()),
  );

  protected readonly brandHref = computed(() =>
    resolveBrandHref(this.context(), this.urls()),
  );

  protected resolveHref = (link: (typeof SITE_NAV_LINKS)[number]): string =>
    resolveNavHref(link, this.context(), this.urls());

  protected isAppRouterPath = isAppRouterPath;

  protected onBrandClick(event: MouseEvent): void {
    event.preventDefault();
    window.location.href = this.brandHref();
  }

  protected toggleMobileMenu(): void {
    this.mobileMenuOpen.update((open) => !open);
  }

  protected closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  protected openSearch(): void {
    this.searchOpen.emit();
    const widgets = (
      globalThis as { DemlWidgets?: { openSearch?: () => void } }
    ).DemlWidgets;
    widgets?.openSearch?.();
  }
}
