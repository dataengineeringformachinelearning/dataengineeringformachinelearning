import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CookieConsentService } from '../../services/cookie-consent.service';

import { MatIconModule } from '@angular/material/icon';

const USA_CONFETTI_COLORS = ['#ff0000', '#ffffff', '#0000ff'];

@Component({
  selector: 'app-footer',
  imports: [RouterLink, MatIconModule],
  templateUrl: './footer.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './footer.scss',
})
export class Footer {
  private consentService = inject(CookieConsentService);

  getCurrentYear(): number {
    return new Date().getFullYear();
  }

  openCookieSettings(event: Event): void {
    event.preventDefault();
    this.consentService.openSettings();
  }

  openBugReporter(event: Event): void {
    event.preventDefault();
    window.dispatchEvent(new CustomEvent('openBugReporter'));
  }

  async fireConfetti(event: MouseEvent): Promise<void> {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;

    const confettiModule = await import('canvas-confetti');
    const confetti = confettiModule.default;
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { x, y },
      colors: USA_CONFETTI_COLORS,
      disableForReducedMotion: true,
      zIndex: 9999,
    });
  }
}
