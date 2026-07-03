import { Component, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';

import { VikingButton, VikingSwitch } from '@dataengineeringformachinelearning/viking-ui';
import { VikingAppIcon } from '../viking-app-icon/viking-app-icon';
import { CookieConsentService } from '../../services/cookie-consent.service';

@Component({
  selector: 'app-cookie-banner',
  imports: [VikingButton, VikingSwitch, VikingAppIcon],
  templateUrl: './cookie-banner.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './cookie-banner.scss',
})
export class CookieBanner implements OnInit {
  protected consentService = inject(CookieConsentService);

  protected showCustomize = signal<boolean>(false);
  protected analyticalConsent = signal<boolean>(false);
  protected marketingConsent = signal<boolean>(false);

  ngOnInit() {
    // Synchronize initial local state with the service
    const current = this.consentService.preferences();
    this.analyticalConsent.set(current.analytical);
    this.marketingConsent.set(current.marketing);
  }

  toggleCustomize() {
    this.showCustomize.update(val => !val);
  }

  acceptAll() {
    this.consentService.acceptAll();
  }

  rejectAll() {
    this.consentService.rejectAll();
  }

  toggleAnalytical(checked: boolean) {
    this.analyticalConsent.set(checked);
  }

  toggleMarketing(checked: boolean) {
    this.marketingConsent.set(checked);
  }

  savePreferences() {
    this.consentService.savePreferences({
      analytical: this.analyticalConsent(),
      marketing: this.marketingConsent(),
    });
  }

  close() {
    this.consentService.closeBanner();
  }
}
