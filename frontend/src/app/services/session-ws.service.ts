import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../environments/environment';
import { SessionStateService } from './session-state.service';

/** WebSocket listener for Dragonfly/Channels forced session revoke. */
@Injectable({ providedIn: 'root' })
export class SessionWsService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly sessionState = inject(SessionStateService);

  private socket: WebSocket | null = null;

  connect(token: string, sessionId: string): void {
    if (!isPlatformBrowser(this.platformId) || !token || !sessionId) {
      return;
    }
    this.disconnect();
    const base = environment.backendUrl.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
    const url = `${base}/ws/session/?token=${encodeURIComponent(token)}&session_id=${encodeURIComponent(sessionId)}`;
    this.socket = new WebSocket(url);
    this.socket.onmessage = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as { type?: string; reason?: string };
        if (payload.type === 'force_logout') {
          void this.sessionState.forceLogout(payload.reason ?? 'revoked');
        }
      } catch {
        /* ignore malformed frames */
      }
    };
    this.socket.onclose = () => {
      this.socket = null;
    };
  }

  disconnect(): void {
    this.socket?.close();
    this.socket = null;
  }
}
