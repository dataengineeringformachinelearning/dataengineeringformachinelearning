import { Component, signal, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HealthService } from '../../services/health.service';

@Component({
  selector: 'app-footer',
  imports: [],
  templateUrl: './footer.html',
  styleUrl: './footer.scss'
})
export class Footer implements OnInit {
  protected readonly backendStatus = signal<'checking' | 'ok' | 'error'>('checking');
  
  private healthService = inject(HealthService);
  private platformId = inject(PLATFORM_ID);

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.healthService.getHealth().subscribe({
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
