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

// Markdown parsing libraries
import { provideHttpClient, withFetch, withInterceptors, HttpClient } from '@angular/common/http';
import { credentialsInterceptor } from './interceptors/credentials.interceptor';
import { cacheInterceptor } from './interceptors/cache.interceptor';
import { telemetryInterceptor } from './core/interceptors/telemetry.interceptor';
import { provideMarkdown } from 'ngx-markdown';

import { routes } from './app.routes';
import { GlobalErrorHandler } from './core/handlers/global-error.handler';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })),
    provideClientHydration(withEventReplay(), withNoIncrementalHydration()),
    provideHttpClient(
      withFetch(),
      withInterceptors([credentialsInterceptor, cacheInterceptor, telemetryInterceptor]),
    ),
    provideMarkdown({ loader: HttpClient }),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    {
      provide: Sentry.TraceService,
      deps: [Router],
    },
    {
      provide: APP_INITIALIZER,
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      useFactory: () => () => {},
      deps: [Sentry.TraceService],
      multi: true,
    },
  ],
};
