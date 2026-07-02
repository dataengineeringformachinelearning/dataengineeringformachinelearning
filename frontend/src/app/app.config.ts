import {
  APP_INITIALIZER,
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  ErrorHandler,
} from '@angular/core';
import { Router, provideRouter, withInMemoryScrolling } from '@angular/router';
import * as Sentry from '@sentry/angular';
import {
  provideClientHydration,
  withEventReplay,
  withNoIncrementalHydration,
} from '@angular/platform-browser';

// API client imports
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { credentialsInterceptor } from './interceptors/credentials.interceptor';
import { cacheInterceptor } from './interceptors/cache.interceptor';
import { telemetryInterceptor } from './core/interceptors/telemetry.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';

import { routes } from './app.routes';
import { GlobalErrorHandler } from './core/handlers/global-error.handler';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })),
    provideClientHydration(withEventReplay(), withNoIncrementalHydration()),
    provideHttpClient(
      withFetch(),
      withInterceptors([
        credentialsInterceptor,
        cacheInterceptor,
        telemetryInterceptor,
        errorInterceptor,
      ]),
    ),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    {
      provide: Sentry.TraceService,
      deps: [Router],
    },
    {
      provide: APP_INITIALIZER,
      useFactory: () => () => {},
      deps: [Sentry.TraceService],
      multi: true,
    },
  ],
};
