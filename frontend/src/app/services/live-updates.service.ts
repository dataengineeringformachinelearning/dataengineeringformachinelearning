import {
  HttpClient,
  HttpDownloadProgressEvent,
  HttpEventType,
  HttpResponse,
} from '@angular/common/http';
import { Injectable, NgZone, OnDestroy, inject } from '@angular/core';
import { Observable, Subject, Subscription } from 'rxjs';
import { environment } from '../../environments/environment';

// --- SSE frame types ---
export interface LiveUpdateEvent {
  type: string;
  data: Record<string, unknown>;
}

// --- Pure SSE frame parser (cumulative buffer → events + unparsed rest) ---
export function parseSseFrames(buffer: string): { events: LiveUpdateEvent[]; rest: string } {
  const events: LiveUpdateEvent[] = [];
  const frames = buffer.split('\n\n');
  const rest = frames.pop() ?? '';
  for (const frame of frames) {
    let type = 'message';
    let data = '';
    for (const line of frame.split('\n')) {
      if (line.startsWith(':')) continue; // keepalive comment
      if (line.startsWith('event:')) type = line.slice(6).trim();
      if (line.startsWith('data:')) data += line.slice(5).trim();
    }
    if (!data) continue;
    try {
      const parsed = JSON.parse(data) as Record<string, unknown>;
      events.push({ type, data: parsed });
    } catch {
      // Malformed frame — skip rather than break the stream.
    }
  }
  return { events, rest };
}

/**
 * Live dashboard updates over the Django BFF SSE lane (/api/v1/analytics/live).
 *
 * Upstream, Supabase Realtime publishes FORJD's stream_results; Django holds the
 * tenant-bound cursor poll and pushes change ticks. The browser never holds
 * Supabase or fjsvc_ credentials — auth is the same Firebase bearer used by
 * every other API call (credentials interceptor). Events carry counts and
 * cursors only; pages reload data through their existing authenticated APIs.
 */
@Injectable({ providedIn: 'root' })
export class LiveUpdatesService implements OnDestroy {
  private http = inject(HttpClient);
  private zone = inject(NgZone);

  private readonly updatesSubject = new Subject<LiveUpdateEvent>();
  readonly updates$: Observable<LiveUpdateEvent> = this.updatesSubject.asObservable();

  private streamSub: Subscription | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private backoffMs = 2000;
  private active = false;
  private consumed = 0;
  private buffer = '';

  private readonly onVisibility = () => {
    if (document.hidden) {
      this.disconnect();
    } else if (this.active) {
      this.connect();
    }
  };

  // --- Lifecycle ---
  start(): void {
    if (this.active) return;
    this.active = true;
    document.addEventListener('visibilitychange', this.onVisibility);
    if (!document.hidden) this.connect();
  }

  stop(): void {
    this.active = false;
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.disconnect();
  }

  ngOnDestroy(): void {
    this.stop();
  }

  // --- Connection with bounded reconnect backoff ---
  private connect(): void {
    this.disconnect();
    this.consumed = 0;
    this.buffer = '';

    this.streamSub = this.http
      .get(`${environment.backendUrl}/api/v1/analytics/live`, {
        observe: 'events',
        responseType: 'text',
        reportProgress: true,
      })
      .subscribe({
        next: event => {
          if (event.type === HttpEventType.DownloadProgress) {
            // partialText is cumulative; only parse the newly received tail.
            const partial = (event as HttpDownloadProgressEvent).partialText ?? '';
            this.buffer += partial.slice(this.consumed);
            this.consumed = partial.length;
            this.emitFrames();
          } else if (event.type === HttpEventType.Response) {
            // Server closed a bounded stream normally — reconnect promptly.
            const ok = (event as HttpResponse<string>).status === 200;
            this.scheduleReconnect(ok ? 1000 : this.nextBackoff());
          }
        },
        error: () => this.scheduleReconnect(this.nextBackoff()),
      });
  }

  private emitFrames(): void {
    const { events, rest } = parseSseFrames(this.buffer);
    this.buffer = rest;
    for (const evt of events) {
      if (evt.type === 'ready') this.backoffMs = 2000; // healthy stream resets backoff
      this.zone.run(() => this.updatesSubject.next(evt));
    }
  }

  private disconnect(): void {
    this.streamSub?.unsubscribe();
    this.streamSub = null;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private nextBackoff(): number {
    const delay = this.backoffMs;
    this.backoffMs = Math.min(this.backoffMs * 2, 60000);
    return delay;
  }

  private scheduleReconnect(delayMs: number): void {
    if (!this.active || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.active && !document.hidden) this.connect();
    }, delayMs);
  }
}
