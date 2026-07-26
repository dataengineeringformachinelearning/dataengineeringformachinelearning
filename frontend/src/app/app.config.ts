import {
  ApplicationConfig,
  ErrorHandler,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withInMemoryScrolling, withPreloading } from '@angular/router';

// API client imports
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { credentialsInterceptor } from './interceptors/credentials.interceptor';
import { cacheInterceptor } from './interceptors/cache.interceptor';
import { telemetryInterceptor } from './core/interceptors/telemetry.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { CriticalPathPreloadingStrategy } from './core/critical-path-preloading.strategy';

import { routes } from './app.routes';
import { GlobalErrorHandler } from './core/handlers/global-error.handler';

// CSR-only (Vercel static). Hydration providers were removed with Angular SSR.
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
      withPreloading(CriticalPathPreloadingStrategy),
    ),
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
  ],
};
