import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';

import { Title, Meta } from '@angular/platform-browser';
import { CookieConsentService } from '../../services/cookie-consent.service';

@Component({
  selector: 'app-privacy',
  imports: [],
  templateUrl: './privacy.html',
  styleUrl: './privacy.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Privacy implements OnInit {
  private titleService = inject(Title);
  private metaService = inject(Meta);
  protected consentService = inject(CookieConsentService);

  ngOnInit() {
    this.titleService.setTitle('Privacy Policy & GDPR Compliance - Web Application');
    this.metaService.updateTag({
      name: 'description',
      content:
        'Privacy policy, cookies preference details, and GDPR compliance documentation for Web Application.',
    });
  }

  openCookieSettings(event: Event) {
    event.preventDefault();
    this.consentService.openSettings();
  }
}
