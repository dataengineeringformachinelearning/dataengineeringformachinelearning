import { Component, signal, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { PageComponent } from './components/page/page';
import { HealthcheckService } from './services/healthcheck.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PageComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected readonly title = signal('frontend');
  protected readonly backendStatus = signal<'checking' | 'ok' | 'error'>('checking');
  
  private healthcheckService = inject(HealthcheckService);
  private platformId = inject(PLATFORM_ID);

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.healthcheckService.getHealthcheck().subscribe({
        next: (response) => {
          if (response.status === 'ok') {
            this.backendStatus.set('ok');
          } else {
            this.backendStatus.set('error');
          }
        },
        error: () => {
          this.backendStatus.set('error');
        },
      });
    }
  }

  getCurrentYear() {
    return new Date().getFullYear();
  }
}
