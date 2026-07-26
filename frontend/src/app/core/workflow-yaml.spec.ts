import {
  composeWorkflowYaml,
  draftFromCatalog,
  draftPipelineCards,
  draftReadyToExport,
  draftSteps,
  validateWorkflowDraft,
  workflowYamlFilename,
} from './workflow-yaml';

describe('workflow-yaml', () => {
  it('seeds a draft from a catalog row', () => {
    const draft = draftFromCatalog({
      id: 'threat_telemetry',
      name: 'Threat telemetry',
      steps: ['rollup', 'size_anomaly', 'rate_anomaly'],
      size_anomaly: { zscore: 2.0, max_cipher_len: 131072 },
      rate_anomaly: { max_events: 200, window_sec: 60 },
      projection: { name: 'threat.sealed_rollup', version: 1 },
      content_types: ['application/forjd-telemetry+v1'],
    });
    expect(draft.useSizeAnomaly).toBe(true);
    expect(draft.useRateAnomaly).toBe(true);
    expect(draft.sizeZscore).toBe(2);
    expect(draftSteps(draft)).toEqual(['rollup', 'size_anomaly', 'rate_anomaly']);
    expect(draftPipelineCards(draft)[0].title).toContain('Seal');
  });

  it('emits deployable YAML with locked E2EE processor', () => {
    const yaml = composeWorkflowYaml(
      draftFromCatalog({
        id: 'partner_stream',
        name: 'Partner stream',
        description: 'Sealed partner ingest.',
        steps: ['rollup', 'size_anomaly'],
      }),
    );
    expect(yaml).toContain('id: partner_stream');
    expect(yaml).toContain('processor: sealed_metadata');
    expect(yaml).toContain('modes: [e2ee]');
    expect(yaml).toContain('- rollup');
    expect(yaml).toContain('- size_anomaly');
    expect(yaml).not.toContain('rate_anomaly:');
    expect(workflowYamlFilename(draftFromCatalog({ id: 'Acme Flow!', name: 'x' }))).toBe(
      'acme_flow_.yaml',
    );
  });

  it('validates drafts before export', () => {
    const ok = draftFromCatalog({
      id: 'partner_stream',
      name: 'Partner',
      content_types: ['application/forjd-event+v1'],
    });
    expect(draftReadyToExport(ok)).toBe(true);
    expect(validateWorkflowDraft(ok).some(i => i.level === 'error')).toBe(false);

    const bad = { ...ok, id: '', sizeZscore: 0, useSizeAnomaly: true };
    const issues = validateWorkflowDraft(bad);
    expect(issues.some(i => i.level === 'error')).toBe(true);
    expect(draftReadyToExport(bad)).toBe(false);
  });
});
