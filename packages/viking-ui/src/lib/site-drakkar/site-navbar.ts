import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  ViewEncapsulation,
  computed,
  inject,
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
              <a
                [href]="resolveHref(link)"
                class="nav-btn"
                (click)="onExternalClick($event, link)"
              >
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
                class="navbar-search-trigger"
                [square]="true"
                [compact]="true"
                id="navbar-search-trigger"
                icon="search"
                label="Open search (⌘K)"
                (pressed)="openSearch()"
              />
            </div>
          }

          <div class="desktop-auth" role="group" aria-label="Account actions">
            @if (!isAuthenticated()) {
              <viking-button
                variant="primary"
                icon="arrow-right"
                class="auth-btn auth-btn-desktop"
                id="auth-btn-desktop"
                [loading]="isBusy()"
                (pressed)="login.emit()"
              >
                Sign In
              </viking-button>
            } @else {
              <viking-button
                variant="ghost"
                class="auth-btn auth-signout-btn"
                id="auth-signout-desktop"
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
            id="mobile-menu-btn"
            [attr.aria-controls]="'mobile-menu'"
            [attr.aria-expanded]="mobileMenuOpen() ? 'true' : 'false'"
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
        id="mobile-menu"
        [class.open]="mobileMenuOpen()"
        [attr.hidden]="mobileMenuOpen() ? null : ''"
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
              (click)="onExternalClick($event, link); closeMobileMenu()"
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
            id="auth-btn-mobile"
            [loading]="isBusy()"
            [fullWidth]="true"
            (pressed)="login.emit(); closeMobileMenu()"
          >
            Sign In
          </viking-button>
        } @else {
          <viking-button
            variant="ghost"
            class="mobile-auth-btn auth-btn auth-signout-btn"
            id="auth-signout-mobile"
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
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

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
  readonly marketingNavigate = output<string>();

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
    if (this.context() !== "app") {
      return;
    }
    event.preventDefault();
    this.marketingNavigate.emit(this.brandHref());
  }

  protected onExternalClick(
    event: MouseEvent,
    link: (typeof SITE_NAV_LINKS)[number],
  ): void {
    if (this.context() !== "app") {
      return;
    }
    const href = this.resolveHref(link);
    try {
      const targetOrigin = new URL(href, window.location.origin).origin;
      const marketingOrigin = new URL(this.urls().marketing).origin;
      if (targetOrigin !== marketingOrigin) {
        return;
      }
    } catch {
      return;
    }
    event.preventDefault();
    this.marketingNavigate.emit(href);
  }

  protected toggleMobileMenu(): void {
    if (!this.isMobileViewport()) {
      this.closeMobileMenu();
      return;
    }
    this.mobileMenuOpen.update((open) => !open);
  }

  protected closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  @HostListener("document:click", ["$event"])
  protected closeMobileMenuOnOutsideClick(event: MouseEvent): void {
    if (!this.mobileMenuOpen()) return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    const path =
      typeof event.composedPath === "function"
        ? event.composedPath()
        : [target];
    const menu = this.host.nativeElement.querySelector("#mobile-menu");
    const toggle = this.host.nativeElement.querySelector("#mobile-menu-btn");
    const clickedInside = path.some(
      (node) =>
        node instanceof Node &&
        ((menu && (node === menu || menu.contains(node))) ||
          (toggle && (node === toggle || toggle.contains(node)))),
    );
    if (!clickedInside) {
      this.closeMobileMenu();
    }
  }

  protected openSearch(): void {
    this.closeMobileMenu();
    this.searchOpen.emit();
    const widgets = (
      globalThis as { DemlWidgets?: { openSearch?: () => void } }
    ).DemlWidgets;
    widgets?.openSearch?.();
  }

  @HostListener("window:resize")
  protected closeMobileMenuOnDesktop(): void {
    if (!this.isMobileViewport()) {
      this.closeMobileMenu();
    }
  }

  @HostListener("document:keydown.escape")
  protected closeMobileMenuOnEscape(): void {
    this.closeMobileMenu();
  }

  private isMobileViewport(): boolean {
    return (
      typeof window === "undefined" ||
      !window.matchMedia("(min-width: 768px)").matches
    );
  }
}
