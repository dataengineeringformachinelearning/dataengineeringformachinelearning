import { Component, signal, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { PageComponent } from './components/page/page';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PageComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected readonly title = signal('frontend');
  protected readonly backendStatus = signal<'checking' | 'ok' | 'error'>('checking');
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.http.get<{ status: string }>(`${environment.backendUrl}${environment.healthCheckEndpoint}`).subscribe({
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
