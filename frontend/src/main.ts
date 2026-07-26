import { isDevMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { environment } from './environments/environment';

const MONITORING_IDLE_TIMEOUT_MS = 2_000;
const ANALYTICS_IDLE_TIMEOUT_MS = 4_000;

const scheduleIdle = (work: () => void, timeoutMs: number): void => {
  if (typeof window === 'undefined') {
    return;
  }
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(work, { timeout: timeoutMs });
    return;
  }
  globalThis.setTimeout(work, timeoutMs);
};

// Vercel analytics — dynamic + idle so SDK code stays out of the critical JS bundle.
const scheduleVercelAnalytics = (): void => {
  const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
  if (typeof window === 'undefined' || localHosts.has(window.location.hostname)) {
    return;
  }
  const mode = isDevMode() ? 'development' : 'production';
  scheduleIdle(() => {
    void Promise.all([import('@vercel/analytics'), import('@vercel/speed-insights')]).then(
      ([{ inject: injectAnalytics }, { injectSpeedInsights }]) => {
        injectAnalytics({ mode });
        injectSpeedInsights({ framework: 'angular' });
      },
    );
  }, ANALYTICS_IDLE_TIMEOUT_MS);
};

const initializeMonitoring = async (): Promise<void> => {
  if (!environment.sentryDsn && !environment.rollbarAccessToken) {
    return;
  }

  try {
    const { initializeMonitoring: initializeMonitoringFacade } =
      await import('./app/core/monitoring/monitoring.facade');
    await initializeMonitoringFacade({
      dsn: environment.sentryDsn,
      rollbarAccessToken: environment.rollbarAccessToken,
      environment: environment.production ? 'production' : 'development',
    });
  } catch (error: unknown) {
    console.error('Monitoring initialization failed:', error);
  }
};

const scheduleMonitoringInitialization = (): void => {
  if (
    (!environment.sentryDsn && !environment.rollbarAccessToken) ||
    typeof window === 'undefined'
  ) {
    return;
  }

  scheduleIdle(() => {
    void initializeMonitoring();
  }, MONITORING_IDLE_TIMEOUT_MS);
};

const startApplication = async (): Promise<void> => {
  try {
    await bootstrapApplication(App, appConfig);
    scheduleVercelAnalytics();
    scheduleMonitoringInitialization();
  } catch (error: unknown) {
    console.error('Application bootstrap failed:', error);
  }
};

void startApplication();
