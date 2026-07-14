import { captureException, init } from '@sentry/angular';

export interface MonitoringConfiguration {
  dsn: string;
  environment: 'production' | 'development';
}

let initializationPromise: Promise<boolean> | null = null;

const runInitialization = async (configuration: MonitoringConfiguration): Promise<boolean> => {
  try {
    init({
      dsn: configuration.dsn,
      environment: configuration.environment,
    });
    return true;
  } catch (error: unknown) {
    console.error('Monitoring initialization failed:', error);
    return false;
  }
};

export const initializeMonitoring = (configuration: MonitoringConfiguration): Promise<boolean> => {
  initializationPromise ??= runInitialization(configuration);
  return initializationPromise;
};

export const captureMonitoringException = async (
  error: unknown,
  configuration: MonitoringConfiguration,
): Promise<void> => {
  const initialized = await initializeMonitoring(configuration);
  if (!initialized) {
    return;
  }

  try {
    captureException(error);
  } catch {
    // Monitoring must never create a second application failure.
  }
};
