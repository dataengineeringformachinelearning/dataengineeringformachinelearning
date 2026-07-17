import {
  buildExportRequestPayload,
  ExportJobRow,
  getExportActionPresentation,
  isExportPending,
} from './analytics';

const exportJob = (overrides: Partial<ExportJobRow> = {}): ExportJobRow => ({
  id: 'f849c45d-2288-4673-82bc-a09a83710f4f',
  kind: 'analytics',
  format: 'csv',
  status: 'queued',
  byte_size: 0,
  content_type: '',
  error: '',
  attempts: 0,
  next_attempt_at: null,
  retrying: false,
  created_at: '2026-07-15T12:00:00Z',
  completed_at: null,
  expires_at: null,
  download_ready: false,
  ...overrides,
});

describe('analytics export contract', () => {
  it('includes a selected site only for site-scoped export kinds', () => {
    const selectedSite = 'https://selected.example/health';

    expect(buildExportRequestPayload('analytics', 'csv', 30, selectedSite)).toEqual({
      kind: 'analytics',
      format: 'csv',
      days: 30,
      site_url: selectedSite,
    });
    expect(buildExportRequestPayload('lighthouse', 'json', 30, selectedSite)).toEqual({
      kind: 'lighthouse',
      format: 'json',
      days: 30,
      site_url: selectedSite,
    });
    expect(buildExportRequestPayload('threat', 'csv', 90, selectedSite)).toEqual({
      kind: 'threat',
      format: 'csv',
      days: 90,
    });
    expect(buildExportRequestPayload('vulnerabilities', 'csv', 90, selectedSite)).toEqual({
      kind: 'vulnerabilities',
      format: 'csv',
      days: 90,
    });
  });

  it('omits the all-sites sentinel from export requests', () => {
    expect(buildExportRequestPayload('analytics', 'csv', 30, 'All')).toEqual({
      kind: 'analytics',
      format: 'csv',
      days: 30,
    });
  });

  it('keeps polling a failed export while the API marks it retrying', () => {
    expect(
      isExportPending(
        exportJob({
          status: 'failed',
          attempts: 1,
          next_attempt_at: '2026-07-15T12:01:00Z',
          retrying: true,
        }),
      ),
    ).toBe(true);
    expect(
      isExportPending(
        exportJob({
          status: 'failed',
          attempts: 5,
          retrying: false,
        }),
      ),
    ).toBe(false);
  });

  it('continues polling queued and running exports', () => {
    expect(isExportPending(exportJob({ status: 'queued' }))).toBe(true);
    expect(isExportPending(exportJob({ status: 'running' }))).toBe(true);
    expect(isExportPending(exportJob({ status: 'ready' }))).toBe(false);
  });

  it('keeps one action footprint while an export moves from processing to ready', () => {
    expect(getExportActionPresentation(exportJob({ status: 'running' }))).toEqual({
      label: 'Processing',
      variant: 'ghost',
      loading: true,
      disabled: true,
    });
    expect(
      getExportActionPresentation(
        exportJob({
          status: 'ready',
          byte_size: 551,
          download_ready: true,
        }),
      ),
    ).toEqual({
      label: 'Download',
      variant: 'primary',
      loading: false,
      disabled: false,
    });
  });

  it('uses a disabled ghost action when export generation cannot continue', () => {
    expect(
      getExportActionPresentation(
        exportJob({ status: 'failed', error: 'Storage unavailable', retrying: false }),
      ),
    ).toEqual({
      label: 'Unavailable',
      variant: 'ghost',
      loading: false,
      disabled: true,
    });
  });
});
