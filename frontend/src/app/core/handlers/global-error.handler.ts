import { ErrorHandler, Injectable, Injector, PLATFORM_ID, inject } from '@angular/core';
import { TelemetryService, TelemetryPayload } from '../services/telemetry.service';
import { isPlatformBrowser } from '@angular/common';
import { VikingToastService } from '@dataengineeringformachinelearning/viking-ui';
import * as Sentry from '@sentry/angular';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly injector = inject(Injector);

  handleError(error: unknown): void {
    const telemetryService = this.injector.get(TelemetryService);

    const payload: TelemetryPayload = {
      url: typeof window !== 'undefined' ? window.location.href : 'ssr-server',
      status_code: 0,
      response_time_ms: 0,
      ip_address: '0.0.0.0',
      is_active: false,
    };

    telemetryService.reportEndpointStatus(payload);
    Sentry.captureException(error);
    console.error('GlobalErrorHandler caught an error:', error);

    if (isPlatformBrowser(this.platformId)) {
      this.injector.get(VikingToastService).show({
        heading: 'System Error',
        text: 'An unexpected system error occurred. Please try again later.',
        tone: 'danger',
        duration: 6000,
      });
    }
  }
}
