import { ErrorHandler, Injectable, Injector, PLATFORM_ID, inject } from '@angular/core';
import { TelemetryService, TelemetryPayload } from '../services/telemetry.service';
import { isPlatformBrowser } from '@angular/common';
import * as Sentry from '@sentry/angular';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private platformId = inject(PLATFORM_ID);

  constructor(private injector: Injector) {}

  handleError(error: any): void {
    const telemetryService = this.injector.get(TelemetryService);
    
    // A client-side or network error occurred
    // Use 0 or 500 to denote client side crash
    let payload: TelemetryPayload = {
      url: typeof window !== 'undefined' ? window.location.href : 'ssr-server',
      status_code: 0,
      response_time_ms: 0,
      ip_address: '0.0.0.0', // We might not know client IP here, backend can overwrite it
      is_active: false
    };

    // Call our resilient telemetry pipeline
    telemetryService.reportEndpointStatus(payload);

    // Report to Sentry
    Sentry.captureException(error);

    // Continue to throw to the console for developer debugging
    console.error('GlobalErrorHandler caught an error:', error);

    // Show user-friendly error UI in browser
    if (isPlatformBrowser(this.platformId)) {
      this.showToast('An unexpected system error occurred. Please try again later.');
    }
  }

  private showToast(message: string): void {
    if (typeof document === 'undefined') return;

    const existing = document.getElementById('global-error-toast');
    if (existing) {
      existing.remove();
    }

    const toast = document.createElement('div');
    toast.id = 'global-error-toast';
    toast.innerHTML = `
      <div class="toast-container">
        <svg class="toast-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" />
        </svg>
        <div class="toast-content">
          <strong class="toast-title">System Error</strong>
          <span class="toast-message">${message}</span>
        </div>
        <button id="close-toast-btn" class="toast-close">&times;</button>
      </div>
    `;

    document.body.appendChild(toast);
    
    const closeBtn = toast.querySelector('#close-toast-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => toast.remove());
    }

    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 6000);
  }
}
