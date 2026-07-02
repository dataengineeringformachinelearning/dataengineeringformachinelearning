import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FluxBar, FluxButton } from '@deml/flux-material';
import { FluxAppIcon } from '../../components/flux-app-icon/flux-app-icon';
import { WhitepaperCta } from '../../components/whitepaper-cta/whitepaper-cta';

const VERSION = '2.0.0';

const QUICK_START = [
  { step: '01', title: 'Connect', description: 'Drop in one script tag or API key.', icon: 'link' },
  {
    step: '02',
    title: 'Observe',
    description: 'Telemetry, threat scores, and CVEs surface in real time.',
    icon: 'visibility',
  },
  {
    step: '03',
    title: 'Act',
    description: 'Triage incidents, block anomalies, and ship with confidence.',
    icon: 'shield',
  },
  {
    step: '04',
    title: 'Scale',
    description: 'Symmetrical for every tenant. Zero extra work per customer.',
    icon: 'trending_up',
  },
] as const;

const CAPABILITIES = [
  {
    tag: 'TELEMETRY',
    title: 'Real-Time Analytics',
    description:
      'Every request is traced, enriched, and projected in under a second. OpenTelemetry flows into ClickHouse rollups and Firestore dashboards.',
    icon: 'analytics',
    metrics: [
      { label: 'P99 Latency', value: '42ms', trend: 'down' },
      { label: 'Uptime', value: '99.97%', trend: 'stable' },
      { label: 'Requests/min', value: '12.4K', trend: 'up' },
    ],
    link: {
      href: 'https://dataengineeringformachinelearning.com/documentation/',
      label: 'View integration docs →',
      muted: false,
    },
  },
  {
    tag: 'SECURITY',
    title: 'Threat Intelligence',
    description:
      'ML models score anomalies the moment they appear. Semgrep and Trivy findings land in a unified triage board.',
    icon: 'security',
    metrics: [
      { label: 'Threat Score', value: '12%', trend: 'down' },
      { label: 'Open CVEs', value: '3', trend: 'down' },
      { label: 'Blocked', value: '847', trend: 'up' },
    ],
    link: { href: '/login', label: 'Start threat monitoring →', muted: true },
  },
  {
    tag: 'PIPELINE',
    title: 'Event Projections',
    description:
      'Commands commit to a transactional Outbox and stream to Redpanda. Idempotent workers materialize live views in Firestore.',
    icon: 'hub',
    metrics: [
      { label: 'Events/sec', value: '8.2K', trend: 'up' },
      { label: 'DLQ Rate', value: '0.01%', trend: 'down' },
      { label: 'Tenants', value: 'Symmetrical', trend: 'stable' },
    ],
    link: { href: '/status/platform-status', label: 'See live projections →', muted: true },
  },
] as const;

const SECURITY_PILLARS = [
  {
    icon: 'lock',
    label: 'AES-256-GCM at rest',
    detail: 'Field-level encryption with KMS rotation',
  },
  {
    icon: 'fingerprint',
    label: 'UUID isolation',
    detail: 'No sequential IDs, no cross-tenant leaks',
  },
  { icon: 'gpp_maybe', label: 'Behavioral intel', detail: 'ASN, ISP, and biometrics enrichment' },
  {
    icon: 'verified_user',
    label: 'Zero-trust auth',
    detail: 'Firebase JWT + ABAC on every endpoint',
  },
] as const;

const INTEGRATIONS = [
  { name: 'Kubernetes', icon: 'hub' },
  { name: 'TensorFlow', icon: 'memory' },
  { name: 'PyTorch', icon: 'psychology' },
  { name: 'Apache Spark', icon: 'bolt' },
  { name: 'Redpanda', icon: 'lan' },
] as const;

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [FluxBar, FluxButton, FluxAppIcon, WhitepaperCta],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Landing {
  readonly version = VERSION;
  readonly quickStart = QUICK_START;
  readonly capabilities = CAPABILITIES;
  readonly securityPillars = SECURITY_PILLARS;
  readonly integrations = INTEGRATIONS;

  trendSymbol(trend: string): string {
    if (trend === 'up') return '↑';
    if (trend === 'down') return '↓';
    return '—';
  }
}
