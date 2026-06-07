import { ErrorHandler, Injectable, Injector, PLATFORM_ID, inject } from '@angular/core';
import { TelemetryService, TelemetryPayload } from '../services/telemetry.service';
import { isPlatformBrowser } from '@angular/common';

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

    // Continue to throw to the console for developer debugging
    console.error('GlobalErrorHandler caught an error:', error);

    // Show user-friendly error UI in browser
    if (isPlatformBrowser(this.platformId)) {
      this.showToast(error?.message || error?.toString() || 'An unexpected error occurred.');
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
      <div style="
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: rgba(239, 68, 68, 0.2);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(239, 68, 68, 0.3);
        color: #fca5a5;
        padding: 16px 20px;
        border-radius: 12px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
        z-index: 99999;
        font-family: 'Outfit', sans-serif;
        display: flex;
        align-items: center;
        gap: 12px;
        max-width: 400px;
        animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style="width: 20px; height: 20px; flex-shrink: 0; color: #ef4444;">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" />
        </svg>
        <div>
          <strong style="display: block; font-size: 14px; margin-bottom: 2px; color: #ffffff;">System Error</strong>
          <span style="font-size: 13px; opacity: 0.9;">${message}</span>
        </div>
        <button id="close-toast-btn" style="
          background: none;
          border: none;
          color: #fca5a5;
          cursor: pointer;
          font-size: 18px;
          line-height: 1;
          padding: 0 4px;
          margin-left: 8px;
          opacity: 0.7;
          transition: opacity 0.2s;
        ">&times;</button>
      </div>
      <style>
        @keyframes slideIn {
          from { transform: translateY(24px) scale(0.95); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
      </style>
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
