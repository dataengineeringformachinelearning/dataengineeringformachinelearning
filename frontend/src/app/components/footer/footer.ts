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
    const duration = 2000;
    const end = Date.now() + duration;

    // Create a native canvas element overlay for confetti
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#FF0000', '#FFFFFF', '#0000FF'];
    const particles: any[] = [];

    for (let i = 0; i < 50; i++) {
      particles.push({
        x: event.clientX,
        y: event.clientY,
        r: Math.random() * 6 + 2,
        dx: Math.random() * 10 - 5,
        dy: Math.random() * -10 - 5,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    const animate = () => {
      requestAnimationFrame(() => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let active = false;
        particles.forEach(p => {
          p.x += p.dx;
          p.y += p.dy;
          p.dy += 0.3; // Gravity

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();

          if (p.y < canvas.height) active = true;
        });

        if (Date.now() < end && active) {
          animate();
        } else {
          document.body.removeChild(canvas);
        }
      });
    };

    animate();
  }
}
