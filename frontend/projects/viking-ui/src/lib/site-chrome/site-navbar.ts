import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { VikingButton } from '../button/button';
import { VikingIcon } from '../icon/icon';
import {
  DEFAULT_SITE_URLS,
  isAppRouterPath,
  resolveBrandHref,
  resolveNavHref,
  SITE_NAV_LINKS,
  SiteChromeContext,
  SiteUrls,
  visibleNavLinks,
} from './site-chrome.config';

/**
 * viking-site-navbar — canonical site header shared across DEML surfaces.
 * Uses `.navbar` markup + viking-ui.css (same structure as marketing/backend static HTML).
 */
@Component({
  selector: 'viking-site-navbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, VikingButton, VikingIcon],
  template: `
    <header class="navbar">
      <div class="navbar-content">
        <div class="navbar-left">
          @if (context() === 'app') {
            <a
              [href]="brandHref()"
              class="navbar-brand"
              aria-label="Go to marketing homepage"
              (click)="onBrandClick($event)"
            >
              <viking-icon name="deml" [size]="28" class="brand-icon navbar-logo glowing-icon-sm" />
            </a>
          } @else {
            <a [href]="brandHref()" class="navbar-brand" aria-label="Go to homepage">
              <viking-icon name="deml" [size]="28" class="brand-icon navbar-logo glowing-icon-sm" />
            </a>
          }
        </div>

        <nav class="navbar-center desktop-nav" aria-label="Main navigation">
          @for (link of navLinks(); track link.id) {
            @if (context() === 'app' && isAppRouterPath(link.appHref)) {
              <a
                [routerLink]="link.appHref"
                routerLinkActive="active"
                [routerLinkActiveOptions]="{ exact: link.appHref === '/explore' }"
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
              <div id="autocomplete" class="algolia-autocomplete-host"></div>
              <button
                type="button"
                class="navbar-search-mobile-btn"
                aria-label="Open search"
                (click)="openSearch()"
              >
                <viking-icon name="search" [size]="20" />
              </button>
            </div>
          }

          <div class="desktop-auth">
            @if (!isAuthenticated()) {
              <viking-button variant="primary" type="button" icon="arrow-right" (pressed)="login.emit()">
                Sign In
              </viking-button>
            } @else {
              <viking-button variant="outline" type="button" icon="log-out" (pressed)="logout.emit()">
                Sign Out
              </viking-button>
            }
          </div>

          <button
            type="button"
            class="theme-toggle-btn"
            aria-label="Toggle light and dark theme"
            (click)="themeToggle.emit()"
          >
            <viking-icon [name]="themeIcon()" [size]="24" />
          </button>

          <button
            type="button"
            class="menu-toggle-btn"
            aria-label="Toggle navigation menu"
            [attr.aria-expanded]="mobileMenuOpen()"
            (click)="toggleMobileMenu()"
          >
            <viking-icon [name]="mobileMenuOpen() ? 'x' : 'menu'" [size]="24" />
          </button>
        </div>
      </div>

      <nav class="mobile-menu" [class.open]="mobileMenuOpen()" aria-label="Mobile navigation">
        @for (link of navLinks(); track link.id + '-mobile') {
          @if (context() === 'app' && isAppRouterPath(link.appHref)) {
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
            <a [href]="resolveHref(link)" class="mobile-nav-btn" (click)="closeMobileMenu()">
              <viking-icon [name]="link.icon" [size]="16" />
              <span>{{ link.label }}</span>
            </a>
          }
        }

        <div class="mobile-divider"></div>

        @if (!isAuthenticated()) {
          <viking-button
            variant="primary"
            type="button"
            icon="arrow-right"
            [fullWidth]="true"
            (pressed)="login.emit(); closeMobileMenu()"
          >
            Sign In
          </viking-button>
        } @else {
          <viking-button
            variant="outline"
            type="button"
            icon="log-out"
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
  readonly context = input<SiteChromeContext>('app');
  readonly urls = input<SiteUrls>(DEFAULT_SITE_URLS);
  readonly isAuthenticated = input<boolean>(false);
  readonly theme = input<'light' | 'dark'>('dark');
  readonly showSearch = input<boolean>(false);

  readonly login = output<void>();
  readonly logout = output<void>();
  readonly themeToggle = output<void>();

  protected readonly mobileMenuOpen = signal(false);

  protected readonly navLinks = computed(() => visibleNavLinks(SITE_NAV_LINKS));

  protected readonly brandHref = computed(() => resolveBrandHref(this.context(), this.urls()));

  protected readonly themeIcon = computed(() => (this.theme() === 'light' ? 'moon' : 'sun'));

  protected resolveHref = (link: (typeof SITE_NAV_LINKS)[number]): string =>
    resolveNavHref(link, this.context(), this.urls());

  protected isAppRouterPath = isAppRouterPath;

  protected onBrandClick(event: MouseEvent): void {
    event.preventDefault();
    window.location.href = this.brandHref();
  }

  protected toggleMobileMenu(): void {
    this.mobileMenuOpen.update(open => !open);
  }

  protected closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  protected openSearch(): void {
    const widgets = (globalThis as { DemlWidgets?: { openSearch?: () => void } }).DemlWidgets;
    widgets?.openSearch?.();
  }
}
