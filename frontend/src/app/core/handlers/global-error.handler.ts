import { ErrorHandler, Injectable, Injector } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { TelemetryService, TelemetryPayload } from '../services/telemetry.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  constructor(private injector: Injector) {}

  handleError(error: any): void {
    const telemetryService = this.injector.get(TelemetryService);
    
    // Build payload. For now, try to extract as much information as possible from HttpErrorResponse
    // If it's a standard Error, we just send a default 500 status representing a client side unhandled error
    let payload: TelemetryPayload = {
      url: window.location.href, // Or try to get the API url if it's HttpErrorResponse
      status_code: 500,
      response_time_ms: 0,
      ip_address: '0.0.0.0', // We might not know client IP here, backend can overwrite it
      is_active: false
    };

    if (error instanceof HttpErrorResponse) {
      // Backend returned an unsuccessful response code
      payload.url = error.url || window.location.href;
      payload.status_code = error.status || 500;
      payload.is_active = error.status >= 200 && error.status < 400; // Basically false for errors
    } else {
      // A client-side or network error occurred
      // Use 0 or 500 to denote client side crash
      payload.status_code = 0; 
      payload.is_active = false;
    }

    // Call our resilient telemetry pipeline
    telemetryService.reportEndpointStatus(payload);

    // Continue to throw to the console for developer debugging
    console.error('GlobalErrorHandler caught an error:', error);
  }
}
