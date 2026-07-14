import { beforeEach, describe, expect, it, vi } from 'vitest';

const { captureExceptionMock, initMock } = vi.hoisted(() => ({
  captureExceptionMock: vi.fn(),
  initMock: vi.fn(),
}));

vi.mock('@sentry/angular', () => ({
  captureException: captureExceptionMock,
  init: initMock,
}));

const configuration = {
  dsn: 'https://public@example.invalid/1',
  environment: 'production' as const,
};

describe('monitoring facade', () => {
  beforeEach(() => {
    vi.resetModules();
    captureExceptionMock.mockReset();
    initMock.mockReset();
  });

  it('initializes only once across concurrent callers', async () => {
    const { initializeMonitoring } = await import('./monitoring.facade');

    const results = await Promise.all([
      initializeMonitoring(configuration),
      initializeMonitoring(configuration),
    ]);

    expect(results).toEqual([true, true]);
    expect(initMock).toHaveBeenCalledTimes(1);
    expect(initMock).toHaveBeenCalledWith(configuration);
  });

  it('waits for initialization before capturing an exception', async () => {
    const { captureMonitoringException, initializeMonitoring } =
      await import('./monitoring.facade');
    const error = new Error('test failure');

    await Promise.all([
      initializeMonitoring(configuration),
      captureMonitoringException(error, configuration),
    ]);

    expect(initMock).toHaveBeenCalledTimes(1);
    expect(captureExceptionMock).toHaveBeenCalledWith(error);
  });

  it('does not capture when initialization fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    initMock.mockImplementationOnce(() => {
      throw new Error('initialization failed');
    });
    const { captureMonitoringException } = await import('./monitoring.facade');

    await expect(
      captureMonitoringException(new Error('application failure'), configuration),
    ).resolves.toBeUndefined();

    expect(captureExceptionMock).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('contains capture failures', async () => {
    captureExceptionMock.mockImplementationOnce(() => {
      throw new Error('capture failed');
    });
    const { captureMonitoringException } = await import('./monitoring.facade');

    await expect(
      captureMonitoringException(new Error('application failure'), configuration),
    ).resolves.toBeUndefined();
  });
});
