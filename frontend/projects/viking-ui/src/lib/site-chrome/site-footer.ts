import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { VikingFooter } from '../footer/footer';
import {
  DEFAULT_SITE_URLS,
  resolveFooterHref,
  SITE_FOOTER_COLUMNS,
  SiteChromeContext,
  SiteFooterLink,
  SiteUrls,
} from './site-chrome.config';

/**
 * viking-site-footer — canonical site footer shared across DEML surfaces.
 */
@Component({
  selector: 'viking-site-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, VikingFooter],
  template: `
    <viking-footer>
      <nav fluxFooterDirectory class="viking-footer-directory footer-directory" aria-label="Footer Directory">
        @for (column of columns; track column.title) {
          <div class="footer-column">
            <h3 class="footer-column-title">{{ column.title }}</h3>
            <ul class="footer-list">
              @for (link of column.links; track link.label) {
                <li>
                  @if (link.action === 'cookie-settings') {
                    @if (context() === 'marketing') {
                      <a href="#" (click)="onCookieSettings($event)">{{ link.label }}</a>
                    }
                  } @else if (link.action === 'bug-report') {
                    <a href="#" (click)="onBugReport($event)">{{ link.label }}</a>
                  } @else if (context() === 'app' && isAppRoute(link)) {
                    <a [routerLink]="link.appHref">{{ link.label }}</a>
                  } @else {
                    <a
                      [href]="resolveHref(link)"
                      [attr.target]="isExternal(link) ? '_blank' : null"
                      [attr.rel]="isExternal(link) ? 'noopener noreferrer' : null"
                    >
                      {{ link.label }}
                    </a>
                  }
                </li>
              }
            </ul>
          </div>
        }
      </nav>

      <ng-container fluxFooterBottom>
        <div class="footer-badges-top">
          <span
            class="usa-badge viking-usa-badge"
            id="usa-badge"
            (mouseenter)="usaBadgeHover.emit($event)"
          >
            <span class="usa-badge-icon viking-usa-badge-icon" aria-hidden="true">🇺🇸</span>
            <span>Made in the U.S.A</span>
          </span>
        </div>

        <div class="footer-compliance-row">
          <div class="copyright-info">
            <span class="copyright-text">
              Copyright © {{ year() }} Data Engineering for Machine Learning by
              <a href="https://joealongi.dev/" target="_blank" rel="noopener noreferrer">Joe Alongi</a>.
              All rights reserved.
            </span>
          </div>
        </div>
      </ng-container>
    </viking-footer>
  `,
})
export class VikingSiteFooter {
  readonly context = input<SiteChromeContext>('app');
  readonly urls = input<SiteUrls>(DEFAULT_SITE_URLS);
  readonly year = input<number>(new Date().getFullYear());

  readonly cookieSettings = output<Event>();
  readonly bugReport = output<Event>();
  readonly usaBadgeHover = output<MouseEvent>();

  protected readonly columns = SITE_FOOTER_COLUMNS;

  protected resolveHref = (link: SiteFooterLink): string =>
    resolveFooterHref(link, this.context(), this.urls());

  protected isAppRoute = (link: SiteFooterLink): boolean =>
    !link.action && !/^https?:\/\//i.test(link.appHref) && link.appHref !== '#';

  protected isExternal = (link: SiteFooterLink): boolean =>
    /^https?:\/\//i.test(this.resolveHref(link));

  protected onCookieSettings(event: Event): void {
    event.preventDefault();
    this.cookieSettings.emit(event);
  }

  protected onBugReport(event: Event): void {
    event.preventDefault();
    this.bugReport.emit(event);
  }
}
