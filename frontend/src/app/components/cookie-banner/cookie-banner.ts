import { Component, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CookieConsentService } from '../../services/cookie-consent.service';

@Component({
  selector: 'app-cookie-banner',
  imports: [CommonModule, MatButtonModule, MatIconModule],
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

  toggleAnalytical() {
    this.analyticalConsent.update(val => !val);
  }

  toggleMarketing() {
    this.marketingConsent.update(val => !val);
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
