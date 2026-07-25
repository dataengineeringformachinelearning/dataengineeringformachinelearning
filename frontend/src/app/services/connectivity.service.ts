import { Injectable, signal } from '@angular/core';

/**
 * Lightweight online/offline signal for graceful degradation.
 * Prefer clear messaging over inventing data when the network is gone.
 */
@Injectable({ providedIn: 'root' })
export class ConnectivityService {
  readonly offline = signal(typeof navigator !== 'undefined' ? navigator.onLine === false : false);

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }
    window.addEventListener('offline', () => this.offline.set(true));
    window.addEventListener('online', () => this.offline.set(false));
  }
}
