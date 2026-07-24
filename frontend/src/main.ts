import { isDevMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { inject as injectAnalytics } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { environment } from './environments/environment';

const MONITORING_IDLE_TIMEOUT_MS = 2_000;

// Framework-agnostic Vercel Web Analytics + Speed Insights.
// Local static servers route unknown Vercel paths to index.html, so inject only on a real host.
const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
if (typeof window !== 'undefined' && !localHosts.has(window.location.hostname)) {
  injectAnalytics({ mode: isDevMode() ? 'development' : 'production' });
  injectSpeedInsights({ framework: 'angular' });
}

const initializeMonitoring = async (): Promise<void> => {
  if (!environment.sentryDsn) {
    return;
  }

  try {
    const { initializeMonitoring: initializeMonitoringFacade } =
      await import('./app/core/monitoring/monitoring.facade');
    await initializeMonitoringFacade({
      dsn: environment.sentryDsn,
      environment: environment.production ? 'production' : 'development',
    });
  } catch (error: unknown) {
    console.error('Monitoring initialization failed:', error);
  }
};

const scheduleMonitoringInitialization = (): void => {
  if (!environment.sentryDsn || typeof window === 'undefined') {
    return;
  }

  const initialize = (): void => {
    void initializeMonitoring();
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(initialize, { timeout: MONITORING_IDLE_TIMEOUT_MS });
    return;
  }

  globalThis.setTimeout(initialize, MONITORING_IDLE_TIMEOUT_MS);
};

const startApplication = async (): Promise<void> => {
  try {
    await bootstrapApplication(App, appConfig);
    scheduleMonitoringInitialization();
  } catch (error: unknown) {
    console.error('Application bootstrap failed:', error);
  }
};

void startApplication();
