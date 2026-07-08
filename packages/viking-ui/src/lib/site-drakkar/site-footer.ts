import {
  ChangeDetectionStrategy,
  Component,
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
        @for (column of columns; track column.title) {
          <div class="footer-column">
            <h3 class="footer-column-title">{{ column.title }}</h3>
            <ul class="footer-list">
              @for (link of column.links; track link.label) {
                <li>
                  @if (link.action === "cookie-settings") {
                    @if (context() === "marketing") {
                      <a href="#" (click)="onCookieSettings($event)">{{
                        link.label
                      }}</a>
                    } @else {
                      <a [href]="cookieSettingsUrl()">{{ link.label }}</a>
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
                    <a [href]="resolveHref(link)">{{ link.label }}</a>
                  }
                </li>
              }
            </ul>
          </div>
        }
      </nav>

      <ng-container vikingFooterBottom>
        <div class="footer-badges-top">
          <span
            class="usa-badge viking-usa-badge"
            id="usa-badge"
            (mouseenter)="usaBadgeHover.emit($event)"
            (focusin)="usaBadgeHover.emit($event)"
            (click)="usaBadgeHover.emit($event)"
            (keydown.enter)="onUsaBadgeKeydown($event)"
            (keydown.space)="onUsaBadgeKeydown($event)"
            role="button"
            tabindex="0"
            aria-label="Celebrate Made in the U.S.A"
          >
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
              Copyright © {{ year() }} Data Engineering for AI Engineering and Cybersecurity by
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

  readonly cookieSettings = output<Event>();
  readonly bugReport = output<Event>();
  readonly usaBadgeHover = output<Event>();

  protected readonly columns = SITE_FOOTER_COLUMNS;

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

  protected onUsaBadgeKeydown(event: Event): void {
    event.preventDefault();
    this.usaBadgeHover.emit(event);
  }
}
