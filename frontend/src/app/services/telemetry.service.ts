import { Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class TelemetryService {
  private ws: WebSocket | null = null;
  public latestTelemetry = signal<any>(null);
  public connectionStatus = signal<'connected' | 'disconnected' | 'connecting'>('disconnected');

  connect(tenantSlug: string) {
    if (this.ws) {
      this.ws.close();
    }
    this.connectionStatus.set('connecting');
    const wsUrl = environment.backendUrl.replace(/^http/, 'ws');
    this.ws = new WebSocket(`${wsUrl}/ws/telemetry/${tenantSlug}/`);

    this.ws.onopen = () => {
      this.connectionStatus.set('connected');
    };

    this.ws.onmessage = event => {
      try {
        const data = JSON.parse(event.data);
        if (data.message) {
          this.latestTelemetry.set(data.message);
        }
      } catch (e) {
        console.error('Error parsing telemetry', e);
      }
    };

    this.ws.onclose = () => {
      this.connectionStatus.set('disconnected');
      // Attempt reconnect after delay
      setTimeout(() => this.connect(tenantSlug), 5000);
    };

    this.ws.onerror = err => {
      console.error('WebSocket error', err);
      this.ws?.close();
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
