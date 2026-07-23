import {
  HttpClient,
  HttpDownloadProgressEvent,
  HttpEventType,
  HttpResponse,
} from '@angular/common/http';
import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { Observable, Subject, Subscription } from 'rxjs';
import { API_ENDPOINTS } from '../core/constants/api.constants';

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
 * Zoneless-friendly: emits via Subject without NgZone.run. Callers that still
 * subscribe to ``updates$`` should prefer reading ``latestEvent`` / effects once
 * pages are fully signalized.
 */
@Injectable({ providedIn: 'root' })
export class LiveUpdatesService implements OnDestroy {
  private http = inject(HttpClient);

  private readonly updatesSubject = new Subject<LiveUpdateEvent>();
  readonly updates$: Observable<LiveUpdateEvent> = this.updatesSubject.asObservable();
  /** Most recent SSE event — preferred for Signal/effect consumers. */
  readonly latestEvent = signal<LiveUpdateEvent | null>(null);
  readonly connected = signal(false);
  /** True after a typed SSE ``degraded`` frame (FORJD cursor poll outage). */
  readonly degraded = signal(false);

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
    this.connected.set(false);
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
      .get(API_ENDPOINTS.ANALYTICS.LIVE, {
        observe: 'events',
        responseType: 'text',
        reportProgress: true,
      })
      .subscribe({
        next: event => {
          if (event.type === HttpEventType.DownloadProgress) {
            const partial = (event as HttpDownloadProgressEvent).partialText ?? '';
            this.buffer += partial.slice(this.consumed);
            this.consumed = partial.length;
            this.emitFrames();
          } else if (event.type === HttpEventType.Response) {
            const ok = (event as HttpResponse<string>).status === 200;
            this.connected.set(false);
            this.scheduleReconnect(ok ? 1000 : this.nextBackoff());
          }
        },
        error: () => {
          this.connected.set(false);
          this.degraded.set(true);
          this.scheduleReconnect(this.nextBackoff());
        },
      });
  }

  private emitFrames(): void {
    const { events, rest } = parseSseFrames(this.buffer);
    this.buffer = rest;
    for (const evt of events) {
      if (evt.type === 'ready') {
        this.backoffMs = 2000;
        this.connected.set(true);
        this.degraded.set(false);
      } else if (evt.type === 'degraded') {
        this.connected.set(false);
        this.degraded.set(true);
      }
      this.latestEvent.set(evt);
      this.updatesSubject.next(evt);
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
