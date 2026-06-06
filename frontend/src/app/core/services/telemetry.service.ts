import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { API_ENDPOINTS } from '../constants/api.constants';

export interface TelemetryPayload {
  url: string;
  status_code: number;
  response_time_ms: number;
  ip_address: string;
  is_active: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TelemetryService {
  private readonly STORAGE_KEY = 'offline_telemetry_queue';
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  constructor(private http: HttpClient) {
    // Listen for network becoming online to sync any queued offline telemetry
    if (this.isBrowser) {
      window.addEventListener('online', () => {
        this.syncOfflineQueue();
      });
    }
  }

  public reportEndpointStatus(payload: TelemetryPayload): void {
    if (!this.isBrowser) {
      // Do not send telemetry during SSR prerendering
      return;
    }

    if (navigator.onLine) {
      this.sendPayload(payload).subscribe({
        error: (err) => {
          console.error('Failed to send telemetry online, queueing offline.', err);
          this.queueForOffline(payload);
        }
      });
    } else {
      console.warn('Network offline. Queueing telemetry for later sync.');
      this.queueForOffline(payload);
    }
  }

  private sendPayload(payload: TelemetryPayload) {
    return this.http.post(API_ENDPOINTS.TELEMETRY.ENDPOINTS, payload);
  }

  private queueForOffline(payload: TelemetryPayload): void {
    if (!this.isBrowser) return;

    let queue: TelemetryPayload[] = [];
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        queue = JSON.parse(stored);
      } catch (e) {
        queue = [];
      }
    }
    queue.push(payload);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(queue));
  }

  private syncOfflineQueue(): void {
    if (!this.isBrowser) return;

    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return;

    let queue: TelemetryPayload[] = [];
    try {
      queue = JSON.parse(stored);
    } catch (e) {
      return;
    }

    if (queue.length === 0) return;

    console.log(`Syncing ${queue.length} offline telemetry events...`);
    
    // Attempt to send all in the queue one by one, keeping track of failures
    const newQueue: TelemetryPayload[] = [];
    let completed = 0;

    queue.forEach(payload => {
      this.sendPayload(payload).subscribe({
        next: () => {
          completed++;
          if (completed === queue.length) {
            if (newQueue.length === 0) {
              localStorage.removeItem(this.STORAGE_KEY);
            } else {
              localStorage.setItem(this.STORAGE_KEY, JSON.stringify(newQueue));
            }
          }
        },
        error: () => {
          completed++;
          newQueue.push(payload); // Failed, keep in queue
          if (completed === queue.length) {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(newQueue));
          }
        }
      });
    });
  }
}
