import { ErrorHandler, Injectable, Injector, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { VikingToastService } from '@dataengineeringformachinelearning/viking-ui';
import { environment } from '../../../environments/environment';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly injector = inject(Injector);

  handleError(error: unknown): void {
    void this.captureInMonitoring(error);
    console.error('GlobalErrorHandler caught an error:', error);

    if (isPlatformBrowser(this.platformId)) {
      queueMicrotask(() => {
        this.injector.get(VikingToastService).show({
          heading: 'System Error',
          text: 'An unexpected system error occurred. Please try again later.',
          tone: 'danger',
          duration: 6000,
        });
      });
    }
  }

  private async captureInMonitoring(error: unknown): Promise<void> {
    if (!environment.sentryDsn || !isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      const { captureMonitoringException } = await import('../monitoring/monitoring.facade');
      await captureMonitoringException(error, {
        dsn: environment.sentryDsn,
        environment: environment.production ? 'production' : 'development',
      });
    } catch {
      // Error reporting must never create a second application failure.
    }
  }
}
