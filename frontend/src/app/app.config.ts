import { ApplicationConfig, provideBrowserGlobalErrorListeners, ErrorHandler } from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  provideClientHydration,
  withEventReplay,
  withNoIncrementalHydration,
} from '@angular/platform-browser';

// Markdown parsing libraries
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { credentialsInterceptor } from './interceptors/credentials.interceptor';
import { provideMarkdown } from 'ngx-markdown';

import { routes } from './app.routes';
import { GlobalErrorHandler } from './core/handlers/global-error.handler';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(withEventReplay(), withNoIncrementalHydration()),
    provideHttpClient(withFetch(), withInterceptors([credentialsInterceptor])),
    provideMarkdown(),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
  ],
};
