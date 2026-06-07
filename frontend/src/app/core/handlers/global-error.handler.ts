import { ErrorHandler, Injectable, Injector } from '@angular/core';
import { TelemetryService, TelemetryPayload } from '../services/telemetry.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
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
  }
}
