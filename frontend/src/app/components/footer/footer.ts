import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CookieConsentService } from '../../services/cookie-consent.service';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  templateUrl: './footer.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './footer.scss',
})
export class Footer {
  private consentService = inject(CookieConsentService);

  getCurrentYear() {
    return new Date().getFullYear();
  }

  openCookieSettings(event: Event) {
    event.preventDefault();
    this.consentService.openSettings();
  }
}

