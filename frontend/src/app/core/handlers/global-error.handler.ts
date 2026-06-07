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
      <style>
        #global-error-toast {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 99999;
          font-family: 'Outfit', sans-serif;
          max-width: 400px;
          animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          
          /* Default Dark Theme variables */
          --toast-bg: rgba(239, 68, 68, 0.15);
          --toast-backdrop: blur(16px);
          --toast-border: 1px solid rgba(239, 68, 68, 0.25);
          --toast-text: #fca5a5;
          --toast-title: #ffffff;
          --toast-icon: #ef4444;
          --toast-close: #fca5a5;
          --toast-close-hover: #ef4444;
          --toast-shadow: 0 12px 32px rgba(0, 0, 0, 0.4), 0 8px 16px rgba(0, 0, 0, 0.3);
        }

        html[data-theme='light'] #global-error-toast {
          /* Light Theme variables */
          --toast-bg: rgba(254, 242, 242, 0.9);
          --toast-backdrop: blur(16px);
          --toast-border: 1px solid rgba(239, 68, 68, 0.3);
          --toast-text: #991b1b;
          --toast-title: #182821;
          --toast-icon: #dc2626;
          --toast-close: #991b1b;
          --toast-close-hover: #dc2626;
          --toast-shadow: 0 12px 32px rgba(24, 40, 33, 0.08), 0 8px 16px rgba(24, 40, 33, 0.06);
        }

        #global-error-toast .toast-container {
          background: var(--toast-bg);
          backdrop-filter: var(--toast-backdrop);
          -webkit-backdrop-filter: var(--toast-backdrop);
          border: var(--toast-border);
          color: var(--toast-text);
          padding: 16px 20px;
          border-radius: 12px;
          box-shadow: var(--toast-shadow);
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.3s ease;
        }

        #global-error-toast .toast-icon {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
          color: var(--toast-icon);
        }

        #global-error-toast .toast-content {
          flex-grow: 1;
        }

        #global-error-toast .toast-title {
          display: block;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 2px;
          color: var(--toast-title);
        }

        #global-error-toast .toast-message {
          font-size: 13px;
          opacity: 0.9;
          line-height: 1.4;
        }

        #global-error-toast .toast-close {
          background: none;
          border: none;
          color: var(--toast-close);
          cursor: pointer;
          font-size: 20px;
          line-height: 1;
          padding: 0 4px;
          margin-left: 8px;
          opacity: 0.7;
          transition: opacity 0.2s, color 0.2s;
        }

        #global-error-toast .toast-close:hover {
          opacity: 1;
          color: var(--toast-close-hover);
        }

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
