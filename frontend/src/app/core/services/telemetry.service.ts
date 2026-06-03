import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

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

  constructor(private http: HttpClient) {
    // Listen for network becoming online to sync any queued offline telemetry
    window.addEventListener('online', () => {
      this.syncOfflineQueue();
    });
  }

  public reportEndpointStatus(payload: TelemetryPayload): void {
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
    // The endpoint path configured in Django-Ninja is /api/v1/telemetry/endpoints
    const url = `${environment.backendUrl}/api/v1/telemetry/endpoints`;
    return this.http.post(url, payload);
  }

  private queueForOffline(payload: TelemetryPayload): void {
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
