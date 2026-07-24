import { sanitizeTelemetryComponent } from './telemetry.interceptor';

describe('sanitizeTelemetryComponent', () => {
  it('produces a routing tag that starts with an alphanumeric character', () => {
    expect(sanitizeTelemetryComponent('/api/v1/analytics/overview')).toBe(
      'api/v1/analytics/overview',
    );
    expect(sanitizeTelemetryComponent('///_status')).toBe('status');
  });

  it('falls back when the path has no valid component', () => {
    expect(sanitizeTelemetryComponent('/')).toBe('spa');
  });

  it('always satisfies the backend routing-tag contract', () => {
    const component = sanitizeTelemetryComponent(`///:<script>${'a'.repeat(200)}?secret=value`);
    expect(component).toMatch(/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/);
    expect(component).toHaveLength(128);
    expect(component).not.toContain('secret');
  });
});
