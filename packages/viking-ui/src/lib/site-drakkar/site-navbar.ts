import { isPlatformBrowser } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from "@angular/core";
import { RouterLink, RouterLinkActive } from "@angular/router";
import { readDemlWidgets } from "../../core/deml-widgets";
import {
  captureReturnFocus,
  focusFirst,
  restoreFocus,
  trapTabKey,
} from "../../core/focus";
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

/** Stable RouterLinkActive options — avoid new object literals each CD. */
const ROUTER_LINK_EXACT = { exact: true } as const;
const ROUTER_LINK_PREFIX = { exact: false } as const;

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
          @for (item of navItems(); track item.link.id) {
            @if (item.useRouter) {
              <a
                [routerLink]="item.link.appHref"
                routerLinkActive="active"
                [routerLinkActiveOptions]="item.routerLinkActiveOptions"
                class="nav-btn"
              >
                <viking-icon [name]="item.link.icon" [size]="16" />
                <span>{{ item.link.label }}</span>
              </a>
            } @else {
              <a
                [href]="item.href"
                class="nav-btn"
                (click)="onExternalClick($event, item.link)"
              >
                <viking-icon [name]="item.link.icon" [size]="16" />
                <span>{{ item.link.label }}</span>
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
            [preference]="themePreference()"
            (toggle)="themeToggle.emit()"
          />

          <viking-button
            variant="outline"
            [square]="true"
            class="menu-toggle-btn"
            [icon]="mobileMenuOpen() ? 'x' : 'menu'"
            id="mobile-menu-btn"
            aria-controls="mobile-menu"
            [aria-expanded]="mobileMenuOpen() ? 'true' : 'false'"
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
        tabindex="-1"
        (keydown)="onMobileMenuKeydown($event)"
      >
        @for (item of navItems(); track item.link.id + "-mobile") {
          @if (item.useRouter) {
            <a
              [routerLink]="item.link.appHref"
              routerLinkActive="active"
              [routerLinkActiveOptions]="item.routerLinkActiveOptions"
              class="mobile-nav-btn"
              (click)="closeMobileMenu()"
            >
              <viking-icon [name]="item.link.icon" [size]="16" />
              <span>{{ item.link.label }}</span>
            </a>
          } @else {
            <a
              [href]="item.href"
              class="mobile-nav-btn"
              (click)="onExternalClick($event, item.link); closeMobileMenu()"
            >
              <viking-icon [name]="item.link.icon" [size]="16" />
              <span>{{ item.link.label }}</span>
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
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  readonly context = input<SiteDrakkarContext>("app");
  readonly urls = input<SiteUrls>(DEFAULT_SITE_URLS);
  readonly isAuthenticated = input<boolean>(false);
  readonly isBusy = input<boolean>(false);
  readonly theme = input<"light" | "dark">("dark");
  readonly themePreference = input<"light" | "dark" | "system">("system");
  readonly showSearch = input<boolean>(false);

  readonly login = output<void>();
  readonly logout = output<void>();
  readonly themeToggle = output<void>();
  readonly searchOpen = output<void>();
  readonly marketingNavigate = output<string>();

  protected readonly mobileMenuOpen = signal(false);
  private mobileMenuReturnFocus: HTMLElement | null = null;

  protected readonly navLinks = computed(() =>
    visibleNavLinks(SITE_NAV_LINKS, this.isAuthenticated()),
  );

  /** Pre-resolved hrefs + stable routerLinkActiveOptions for the template. */
  protected readonly navItems = computed(() => {
    const ctx = this.context();
    const urls = this.urls();
    return this.navLinks().map((link) => ({
      link,
      href: resolveNavHref(link, ctx, urls),
      useRouter: ctx === "app" && isAppRouterPath(link.appHref),
      routerLinkActiveOptions:
        link.appHref === "/explore" ? ROUTER_LINK_EXACT : ROUTER_LINK_PREFIX,
    }));
  });

  protected readonly brandHref = computed(() =>
    resolveBrandHref(this.context(), this.urls()),
  );

  constructor() {
    // Focus into the drawer on open; restore to the toggle on close
    let wasOpen = false;
    effect(() => {
      const isOpen = this.mobileMenuOpen();
      if (!isPlatformBrowser(this.platformId)) return;
      queueMicrotask(() => {
        const menu =
          this.host.nativeElement.querySelector<HTMLElement>("#mobile-menu");
        if (isOpen && !wasOpen) {
          this.mobileMenuReturnFocus = captureReturnFocus();
          if (menu) focusFirst(menu);
        } else if (!isOpen && wasOpen) {
          restoreFocus(this.mobileMenuReturnFocus);
          this.mobileMenuReturnFocus = null;
        }
        wasOpen = isOpen;
      });
    });

    // Document listeners only while the mobile menu is open (avoids CD on every click)
    effect((onCleanup) => {
      if (!this.mobileMenuOpen() || !isPlatformBrowser(this.platformId)) {
        return;
      }
      const onClick = (event: MouseEvent): void => {
        const target = event.target;
        if (!(target instanceof Node)) return;
        const path =
          typeof event.composedPath === "function"
            ? event.composedPath()
            : [target];
        const menu = this.host.nativeElement.querySelector("#mobile-menu");
        const toggle =
          this.host.nativeElement.querySelector("#mobile-menu-btn");
        const clickedInside = path.some(
          (node) =>
            node instanceof Node &&
            ((menu !== null && (node === menu || menu.contains(node))) ||
              (toggle !== null && (node === toggle || toggle.contains(node)))),
        );
        if (!clickedInside) {
          this.closeMobileMenu();
        }
      };
      const onKeydown = (event: KeyboardEvent): void => {
        if (event.key === "Escape") {
          this.closeMobileMenu();
        }
      };
      document.addEventListener("click", onClick);
      document.addEventListener("keydown", onKeydown);
      onCleanup(() => {
        document.removeEventListener("click", onClick);
        document.removeEventListener("keydown", onKeydown);
      });
    });

    if (isPlatformBrowser(this.platformId)) {
      const desktopQuery = window.matchMedia("(min-width: 768px)");
      const onViewport = (event: MediaQueryListEvent): void => {
        if (event.matches) {
          this.closeMobileMenu();
        }
      };
      desktopQuery.addEventListener("change", onViewport);
      this.destroyRef.onDestroy(() => {
        desktopQuery.removeEventListener("change", onViewport);
      });
    }
  }

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
    const href = resolveNavHref(link, this.context(), this.urls());
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
    if (this.mobileMenuOpen()) {
      this.mobileMenuOpen.set(false);
    }
  }

  protected onMobileMenuKeydown(event: KeyboardEvent): void {
    const menu =
      this.host.nativeElement.querySelector<HTMLElement>("#mobile-menu");
    if (menu) trapTabKey(event, menu);
  }

  protected openSearch(): void {
    this.closeMobileMenu();
    this.searchOpen.emit();
    readDemlWidgets().openSearch?.();
  }

  private isMobileViewport(): boolean {
    return (
      typeof window === "undefined" ||
      !window.matchMedia("(min-width: 768px)").matches
    );
  }
}
