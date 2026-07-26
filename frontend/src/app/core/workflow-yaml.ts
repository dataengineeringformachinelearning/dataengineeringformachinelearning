/**
 * Client-side workflow compose helpers.
 * Emit FORJD-compatible YAML — deploy by placing under backend/workflows/.
 * Never persists to FORJD from the browser (YAML remains SoT).
 */

import type { VikingPipelineStep } from '@dataengineeringformachinelearning/viking-ui';

// --- Catalog row from GET /api/v1/workflows ---
export type WorkflowCatalogRow = {
  id: string;
  name: string;
  description?: string;
  version?: number;
  enabled?: boolean;
  default?: boolean;
  content_types?: string[];
  event_types?: string[];
  catalog_event_types?: Array<{
    name: string;
    content_type?: string;
    description?: string;
  }>;
  aliases?: {
    workflow_ids?: string[];
    event_types?: Record<string, string[]>;
    content_types?: string[];
  };
  processor?: string;
  steps?: string[];
  pipeline_steps?: VikingPipelineStep[];
  size_anomaly?: { zscore?: number; max_cipher_len?: number };
  rate_anomaly?: { max_events?: number; window_sec?: number };
  projection?: {
    name?: string;
    version?: number;
    description?: string;
    retention_days?: number | null;
  };
  encryption?: { modes?: string[]; algos?: string[] };
  outputs?: { table?: string; tags?: Record<string, string> };
};

export type WorkflowDraft = {
  id: string;
  name: string;
  description: string;
  version: number;
  enabled: boolean;
  default: boolean;
  contentTypes: string;
  useSizeAnomaly: boolean;
  useRateAnomaly: boolean;
  sizeZscore: number;
  sizeMaxCipherLen: number;
  rateMaxEvents: number;
  rateWindowSec: number;
  projectionName: string;
  projectionVersion: number;
  outputTagUseCase: string;
  outputTagVertical: string;
};

export const WORKFLOW_STEP_CARDS: Record<
  string,
  { title: string; detail: string; kind: VikingPipelineStep['kind'] }
> = {
  rollup: {
    title: 'Seal & roll up',
    detail: 'Aggregate ciphertext metadata into a durable projection — never opens content.',
    kind: 'process',
  },
  size_anomaly: {
    title: 'Size anomaly',
    detail: 'Flag envelopes whose ciphertext length is unusually large for this stream.',
    kind: 'detect',
  },
  rate_anomaly: {
    title: 'Rate anomaly',
    detail: 'Flag bursts that exceed the configured event-rate window.',
    kind: 'detect',
  },
};

// --- Draft seeding ---
export function draftFromCatalog(row: WorkflowCatalogRow | null): WorkflowDraft {
  const steps = row?.steps ?? ['rollup', 'size_anomaly'];
  const projection = row?.projection ?? {};
  const tags = row?.outputs?.tags ?? {};
  return {
    id: row?.id ?? 'partner_stream',
    name: row?.name ?? 'Partner stream',
    description: (row?.description ?? '').trim(),
    version: row?.version ?? 1,
    enabled: row?.enabled !== false,
    default: Boolean(row?.default),
    contentTypes: (row?.content_types ?? ['application/forjd-event+v1']).join(', '),
    useSizeAnomaly: steps.includes('size_anomaly'),
    useRateAnomaly: steps.includes('rate_anomaly'),
    sizeZscore: Number(row?.size_anomaly?.zscore ?? 2.5),
    sizeMaxCipherLen: Number(row?.size_anomaly?.max_cipher_len ?? 262144),
    rateMaxEvents: Number(row?.rate_anomaly?.max_events ?? 500),
    rateWindowSec: Number(row?.rate_anomaly?.window_sec ?? 60),
    projectionName: String(projection.name ?? 'sealed.default'),
    projectionVersion: Number(projection.version ?? 1),
    outputTagUseCase: String(tags['use_case'] ?? row?.id ?? 'partner_stream'),
    outputTagVertical: String(tags['vertical'] ?? 'partner'),
  };
}

export function draftSteps(draft: WorkflowDraft): string[] {
  const steps = ['rollup'];
  if (draft.useSizeAnomaly) steps.push('size_anomaly');
  if (draft.useRateAnomaly) steps.push('rate_anomaly');
  return steps;
}

export function draftPipelineCards(draft: WorkflowDraft): VikingPipelineStep[] {
  return draftSteps(draft).map(id => {
    const card = WORKFLOW_STEP_CARDS[id];
    return {
      id,
      title: card?.title ?? id,
      detail: card?.detail ?? '',
      kind: card?.kind ?? 'unknown',
    };
  });
}

// --- YAML emit (hand-rolled; no js-yaml dependency) ---
function yamlScalar(value: string | number | boolean): string {
  if (typeof value === 'boolean' || typeof value === 'number') {
    return String(value);
  }
  const text = value.replace(/\r\n/g, '\n');
  if (text === '') return '""';
  if (/^[a-zA-Z0-9_./+-]+$/.test(text) && !/^(true|false|null|yes|no)$/i.test(text)) {
    return text;
  }
  return JSON.stringify(text);
}

function yamlBlock(text: string, indent: string): string {
  const lines = text.replace(/\r\n/g, '\n').trimEnd().split('\n');
  if (lines.length <= 1 && !text.includes(':') && text.length < 80) {
    return yamlScalar(text.trim());
  }
  return `>\n${lines.map(line => `${indent}${line}`).join('\n')}`;
}

export function composeWorkflowYaml(draft: WorkflowDraft): string {
  const id =
    draft.id
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_.-]+/g, '_') || 'partner_stream';
  const contentTypes = draft.contentTypes
    .split(/[,;\n]+/)
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
  const steps = draftSteps(draft);
  const lines: string[] = [
    `# Generated by DEML Pipeline Studio — deploy under FORJD backend/workflows/.`,
    `# YAML remains the source of truth; this file is not persisted by the browser.`,
    `id: ${yamlScalar(id)}`,
    `name: ${yamlScalar(draft.name.trim() || id)}`,
  ];
  if (draft.description.trim()) {
    lines.push(`description: ${yamlBlock(draft.description.trim(), '  ')}`);
  }
  lines.push(
    `version: ${Math.max(1, Math.floor(draft.version) || 1)}`,
    `enabled: ${draft.enabled}`,
    `default: ${draft.default}`,
    ``,
    `match:`,
    `  content_types:`,
  );
  for (const ct of contentTypes.length ? contentTypes : ['application/forjd-event+v1']) {
    lines.push(`    - ${yamlScalar(ct)}`);
  }
  lines.push(
    `  event_types: []`,
    ``,
    `encryption:`,
    `  modes: [e2ee]`,
    `  algos: [aes-256-gcm]`,
    ``,
  );
  lines.push(`pipeline:`, `  processor: sealed_metadata`, `  projection:`);
  lines.push(
    `    name: ${yamlScalar(draft.projectionName.trim().toLowerCase() || 'sealed.default')}`,
  );
  lines.push(`    version: ${Math.max(1, Math.floor(draft.projectionVersion) || 1)}`);
  lines.push(`  steps:`);
  for (const step of steps) {
    lines.push(`    - ${step}`);
  }
  if (draft.useSizeAnomaly) {
    lines.push(`  size_anomaly:`);
    lines.push(`    zscore: ${Number(draft.sizeZscore) || 2.5}`);
    lines.push(`    max_cipher_len: ${Math.max(1, Math.floor(draft.sizeMaxCipherLen) || 262144)}`);
  }
  if (draft.useRateAnomaly) {
    lines.push(`  rate_anomaly:`);
    lines.push(`    max_events: ${Math.max(1, Math.floor(draft.rateMaxEvents) || 500)}`);
    lines.push(`    window_sec: ${Math.max(1, Math.floor(draft.rateWindowSec) || 60)}`);
  }
  lines.push(``, `outputs:`, `  table: stream_results`, `  tags:`);
  lines.push(`    use_case: ${yamlScalar(draft.outputTagUseCase.trim() || id)}`);
  lines.push(`    vertical: ${yamlScalar(draft.outputTagVertical.trim() || 'partner')}`);
  lines.push(``);
  return lines.join('\n');
}

export function workflowYamlFilename(draft: WorkflowDraft): string {
  const id =
    draft.id
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_.-]+/g, '_') || 'partner_stream';
  return `${id}.yaml`;
}

// --- Client-side draft checks (FORJD CLI remains authoritative) ---
export type WorkflowValidationIssue = {
  level: 'error' | 'warning';
  message: string;
};

export function validateWorkflowDraft(draft: WorkflowDraft): WorkflowValidationIssue[] {
  const issues: WorkflowValidationIssue[] = [];
  const id = draft.id
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, '_');
  if (!id) {
    issues.push({ level: 'error', message: 'Workflow ID is required.' });
  } else if (!/^[a-z0-9][a-z0-9_.-]*$/.test(id)) {
    issues.push({
      level: 'error',
      message: 'Workflow ID must start with a letter or digit (a-z, 0-9, _, ., -).',
    });
  }
  if (!draft.name.trim()) {
    issues.push({ level: 'error', message: 'Name is required.' });
  }
  const contentTypes = draft.contentTypes
    .split(/[,;\n]+/)
    .map(s => s.trim())
    .filter(Boolean);
  if (contentTypes.length === 0) {
    issues.push({ level: 'error', message: 'At least one content type is required.' });
  }
  if (!draft.projectionName.trim()) {
    issues.push({ level: 'error', message: 'Projection name is required.' });
  }
  if (!Number.isFinite(draft.version) || draft.version < 1) {
    issues.push({ level: 'error', message: 'Version must be ≥ 1.' });
  }
  if (draft.useSizeAnomaly) {
    if (!(draft.sizeZscore > 0)) {
      issues.push({ level: 'error', message: 'Size z-score must be greater than 0.' });
    }
    if (!(draft.sizeMaxCipherLen >= 1)) {
      issues.push({ level: 'error', message: 'Max cipher length must be ≥ 1.' });
    }
  }
  if (draft.useRateAnomaly) {
    if (!(draft.rateMaxEvents >= 1)) {
      issues.push({ level: 'error', message: 'Rate max events must be ≥ 1.' });
    }
    if (!(draft.rateWindowSec >= 1)) {
      issues.push({ level: 'error', message: 'Rate window must be ≥ 1 second.' });
    }
  }
  if (!draft.useSizeAnomaly && !draft.useRateAnomaly) {
    issues.push({
      level: 'warning',
      message: 'No detectors enabled — rollup only (valid, but quieter signals).',
    });
  }
  return issues;
}

export function draftReadyToExport(draft: WorkflowDraft): boolean {
  return !validateWorkflowDraft(draft).some(i => i.level === 'error');
}
