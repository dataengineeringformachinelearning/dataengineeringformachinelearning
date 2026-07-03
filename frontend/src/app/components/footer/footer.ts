import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { VikingSiteFooter } from '@dataengineeringformachinelearning/viking-ui';
import { environment } from '../../../environments/environment';

const USA_CONFETTI_COLORS = ['#ff0000', '#ffffff', '#0000ff'] as const;

@Component({
  selector: 'app-footer',
  imports: [VikingSiteFooter],
  template: `
    <viking-site-footer
      context="app"
      [urls]="siteUrls"
      (bugReport)="openBugReporter($event)"
      (usaBadgeHover)="fireConfetti($event)"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Footer {
  protected readonly siteUrls = {
    app: environment.frontendUrl ?? '',
    marketing: environment.marketingUrl ?? 'https://dataengineeringformachinelearning.com',
    backend: environment.backendUrl ?? '',
  };

  openBugReporter(event: Event): void {
    event.preventDefault();
    window.dispatchEvent(new CustomEvent('openBugReporter'));
  }

  async fireConfetti(event: MouseEvent): Promise<void> {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;

    const confettiModule = await import('canvas-confetti');
    confettiModule.default({
      particleCount: 50,
      spread: 60,
      origin: { x, y },
      colors: [...USA_CONFETTI_COLORS],
      disableForReducedMotion: true,
      zIndex: 9999,
    });
  }
}
