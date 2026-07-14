import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { VikingFooter } from "../footer/footer";
import {
  cookieSettingsHref,
  DEFAULT_SITE_URLS,
  isAppRouterPath,
  resolveFooterHref,
  SITE_FOOTER_COLUMNS,
  SiteDrakkarContext,
  SiteFooterLink,
  SiteUrls,
} from "./site-drakkar.config";

/**
 * viking-site-footer — canonical site footer shared across DEML surfaces.
 */
@Component({
  selector: "viking-site-footer",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, VikingFooter],
  template: `
    <viking-footer>
      <nav
        vikingFooterDirectory
        class="viking-footer-directory footer-directory"
        aria-label="Footer Directory"
      >
        @for (column of columns(); track column.title) {
          <div class="footer-column">
            <h2 class="footer-column-title">{{ column.title }}</h2>
            <ul class="footer-list">
              @for (link of column.links; track link.label) {
                <li>
                  @if (link.action === "cookie-settings") {
                    @if (context() === "marketing") {
                      <a href="#" (click)="onCookieSettings($event)">{{
                        link.label
                      }}</a>
                    } @else {
                      <a
                        [href]="cookieSettingsUrl()"
                        (click)="
                          onMarketingHrefClick($event, cookieSettingsUrl())
                        "
                        >{{ link.label }}</a
                      >
                    }
                  } @else if (link.action === "bug-report") {
                    @if (context() === "app") {
                      <a href="#" (click)="onBugReport($event)">{{
                        link.label
                      }}</a>
                    } @else {
                      <a [href]="resolveHref(link)">{{ link.label }}</a>
                    }
                  } @else if (context() === "app" && isAppRoute(link)) {
                    <a [routerLink]="link.appHref">{{ link.label }}</a>
                  } @else {
                    <a
                      [href]="resolveHref(link)"
                      (click)="onExternalClick($event, link)"
                      >{{ link.label }}</a
                    >
                  }
                </li>
              }
            </ul>
          </div>
        }
      </nav>

      <ng-container vikingFooterBottom>
        <div class="footer-badges-top">
          <span class="usa-badge viking-usa-badge" id="usa-badge">
            <span
              class="usa-badge-icon viking-usa-badge-icon"
              aria-hidden="true"
              >🇺🇸</span
            >
            <span>Made in the U.S.A</span>
          </span>
        </div>

        <div class="footer-compliance-row">
          <div class="copyright-info">
            <span class="copyright-text">
              Copyright © {{ year() }} Data Engineering for AI Engineering and
              Cybersecurity by
              <a
                href="https://joealongi.dev/"
                target="_blank"
                rel="noopener noreferrer"
                >Joe Alongi</a
              >. All rights reserved.
            </span>
          </div>
        </div>
      </ng-container>
    </viking-footer>
  `,
})
export class VikingSiteFooter {
  readonly context = input<SiteDrakkarContext>("app");
  readonly urls = input<SiteUrls>(DEFAULT_SITE_URLS);
  readonly year = input<number>(new Date().getFullYear());
  readonly isAuthenticated = input<boolean>(false);

  readonly cookieSettings = output<Event>();
  readonly bugReport = output<Event>();
  readonly marketingNavigate = output<string>();

  protected readonly columns = computed(() =>
    SITE_FOOTER_COLUMNS.map((column) => ({
      ...column,
      links: column.links.filter(
        (link) => !link.requireAuth || this.isAuthenticated(),
      ),
    })),
  );

  protected readonly cookieSettingsUrl = () => cookieSettingsHref(this.urls());

  protected resolveHref = (link: SiteFooterLink): string =>
    resolveFooterHref(link, this.context(), this.urls());

  protected isAppRoute = (link: SiteFooterLink): boolean =>
    !link.action && isAppRouterPath(link.appHref);

  protected onCookieSettings(event: Event): void {
    event.preventDefault();
    this.cookieSettings.emit(event);
  }

  protected onBugReport(event: Event): void {
    event.preventDefault();
    this.bugReport.emit(event);
  }

  protected onExternalClick(event: Event, link: SiteFooterLink): void {
    this.onMarketingHrefClick(event, this.resolveHref(link));
  }

  protected onMarketingHrefClick(event: Event, href: string): void {
    if (this.context() !== "app") {
      return;
    }
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
}
