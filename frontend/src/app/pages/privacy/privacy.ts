import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';

import { Title, Meta } from '@angular/platform-browser';
import { CookieConsentService } from '../../services/cookie-consent.service';
import {
  UnifiedSelect,
  SelectOption,
} from '../../components/unified-select/unified-select.component';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [UnifiedSelect],
  templateUrl: './privacy.html',
  styleUrl: './privacy.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Privacy implements OnInit {
  private titleService = inject(Title);
  private metaService = inject(Meta);
  protected consentService = inject(CookieConsentService);

  public gdprRequestType = 'export';
  public gdprOptions: SelectOption[] = [
    { value: 'export', label: 'Export My Data (Portability)' },
    { value: 'delete', label: 'Delete My Data (Erasure)' },
    { value: 'rectify', label: 'Rectify/Correct Incorrect Data' },
  ];

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
