import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CookieConsentService } from '../../services/cookie-consent.service';

import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, MatIconModule],
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

  openBugReporter(event: Event) {
    event.preventDefault();
    window.dispatchEvent(new CustomEvent('openBugReporter'));
  }

  fireConfetti(event: MouseEvent) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;

    import('canvas-confetti').then(confettiModule => {
      const confetti = confettiModule.default;
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { x, y },
        colors: ['#FF0000', '#FFFFFF', '#0000FF'],
        disableForReducedMotion: true,
        zIndex: 9999,
      });
    });
  }
}
