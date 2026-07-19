import { Injectable, PLATFORM_ID, inject, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { API_ENDPOINTS } from '../constants/api.constants';
import { environment } from '../../../environments/environment';

export interface TelemetryPayload {
  url: string;
  status_code: number;
  response_time_ms: number;
  ip_address: string;
  is_active: boolean;
}

interface QueuedTelemetry {
  queuedAt: number;
  payload: TelemetryPayload;
}

@Injectable({
  providedIn: 'root',
})
export class TelemetryService implements OnDestroy {
  private readonly STORAGE_KEY = 'offline_telemetry_queue';
  private readonly MAX_QUEUE_EVENTS = 100;
  private readonly MAX_QUEUE_AGE_MS = 24 * 60 * 60 * 1000;
  private readonly MAX_QUEUE_CHARS = 256 * 1024;
  private readonly enabled = environment.enableLegacyPlaintextTelemetry;
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  private http = inject(HttpClient);
  private syncInFlight = false;

  private onlineListener = () => {
    void this.syncOfflineQueue();
  };

  constructor() {
    if (this.isBrowser && this.enabled) {
      window.addEventListener('online', this.onlineListener);
      this.persistQueue(this.readQueue());
    } else if (this.isBrowser) {
      // Purge payloads left by earlier releases now that plaintext reporting is off.
      this.removeQueue();
    }
  }

  ngOnDestroy(): void {
    if (this.isBrowser && this.enabled) {
      window.removeEventListener('online', this.onlineListener);
    }
  }

  public reportEndpointStatus(payload: TelemetryPayload): void {
    if (!this.isBrowser || !this.enabled) {
      return;
    }

    if (navigator.onLine) {
      this.sendPayload(payload).subscribe({
        error: () => {
          this.queueForOffline(payload);
        },
      });
    } else {
      this.queueForOffline(payload);
    }
  }

  private sendPayload(payload: TelemetryPayload) {
    return this.http.post(API_ENDPOINTS.TELEMETRY.ENDPOINTS, payload);
  }

  private queueForOffline(payload: TelemetryPayload): void {
    if (!this.isBrowser || !this.enabled) return;
    const queue = this.readQueue();
    queue.push({ queuedAt: Date.now(), payload });
    this.persistQueue(queue);
  }

  private async syncOfflineQueue(): Promise<void> {
    if (!this.isBrowser || !this.enabled || this.syncInFlight) return;
    const queue = this.readQueue();
    if (queue.length === 0) {
      this.removeQueue();
      return;
    }

    this.syncInFlight = true;
    const remaining: QueuedTelemetry[] = [];
    try {
      // Sequential replay avoids a reconnect burst against a deprecated endpoint.
      for (const entry of queue) {
        try {
          await firstValueFrom(this.sendPayload(entry.payload));
        } catch {
          remaining.push(entry);
        }
      }
      this.persistQueue(remaining);
    } finally {
      this.syncInFlight = false;
    }
  }

  private readQueue(): QueuedTelemetry[] {
    if (!this.isBrowser || !this.enabled) return [];
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
      if (!Array.isArray(parsed)) return [];
      const cutoff = Date.now() - this.MAX_QUEUE_AGE_MS;
      return parsed
        .filter(
          (entry): entry is QueuedTelemetry =>
            typeof entry === 'object' &&
            entry !== null &&
            typeof (entry as QueuedTelemetry).queuedAt === 'number' &&
            (entry as QueuedTelemetry).queuedAt >= cutoff &&
            typeof (entry as QueuedTelemetry).payload === 'object' &&
            (entry as QueuedTelemetry).payload !== null,
        )
        .slice(-this.MAX_QUEUE_EVENTS);
    } catch {
      return [];
    }
  }

  private persistQueue(entries: QueuedTelemetry[]): void {
    if (!this.isBrowser || !this.enabled) return;
    const queue = entries.slice(-this.MAX_QUEUE_EVENTS);
    while (queue.length > 0 && JSON.stringify(queue).length > this.MAX_QUEUE_CHARS) {
      queue.shift();
    }
    if (queue.length === 0) {
      this.removeQueue();
      return;
    }
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(queue));
    } catch {
      // Storage may be unavailable or full; telemetry must never affect the app flow.
    }
  }

  private removeQueue(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch {
      // Storage may be unavailable; the reporting path remains best effort.
    }
  }
}
