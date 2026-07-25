import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { VikingPageMockup } from '@dataengineeringformachinelearning/viking-ui';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { VikingAppIcon } from '../../components/viking-app-icon/viking-app-icon';

type MetricKey = 'p99' | 'uptime' | 'requests' | 'threats' | 'static';

type ShowcaseMetric = {
  label: string;
  key: MetricKey;
  trend: 'up' | 'down' | 'stable';
  staticValue?: string;
};

type ShowcaseCapability = {
  tag: string;
  title: string;
  description: string;
  icon: string;
  metrics: ShowcaseMetric[];
  linkHref: string;
  linkLabel: string;
  authedHref?: string;
  authedLabel?: string;
};

type DocsStep = {
  title: string;
  detail: string;
  href: string;
  external?: boolean;
};

type ApiDocLink = {
  name: string;
  detail: string;
  swaggerHref: string;
  redocHref: string;
};

// --- Public DEML product showcase (former marketing homepage) ---
@Component({
  selector: 'app-product-home',
  standalone: true,
  imports: [RouterLink, VikingAppIcon, VikingPageMockup],
  templateUrl: './product-home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductHome implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);

  protected readonly marketingUrl = environment.marketingUrl;
  protected readonly backendUrl = environment.backendUrl;
  protected readonly forjdApiUrl = environment.forjdApiUrl;
  protected readonly version = environment.version;
  protected readonly isAuthenticated = this.auth.isAuthenticated;

  protected readonly p99Value = signal('Live');
  protected readonly uptimeValue = signal('Live');
  protected readonly requestsValue = signal('Live');
  protected readonly threatsValue = signal('Live');

  protected readonly widgetSnippet = `<script src="/assets/widgets/widget.js" data-backend-url="${environment.backendUrl}" data-frontend-url="${environment.frontendUrl}" data-page-id="platform-status" async defer></script>`;

  protected readonly quickStartSteps = [
    {
      step: '01',
      title: 'Connect',
      description: 'Deploy one script tag or API key. No agent fleet to maintain.',
      icon: 'link',
    },
    {
      step: '02',
      title: 'Observe',
      description: 'Telemetry, threat scores, and CVE posture surface in real time.',
      icon: 'visibility',
    },
    {
      step: '03',
      title: 'Act',
      description: 'Triage incidents, contain anomalies, and sustain operational tempo.',
      icon: 'shield',
    },
    {
      step: '04',
      title: 'Scale',
      description: 'Symmetrical pipelines for every tenant. Zero per-customer overhead.',
      icon: 'trending_up',
    },
  ] as const;

  protected readonly integrations = [
    { name: 'Kubernetes', icon: 'kubernetes' },
    { name: 'TensorFlow', icon: 'tensorflow' },
    { name: 'PyTorch', icon: 'pytorch' },
    { name: 'Apache Spark', icon: 'apache-spark' },
    { name: 'Databricks', icon: 'databricks' },
    { name: 'AWS Redshift', icon: 'aws-redshift' },
  ] as const;

  protected readonly capabilities: ShowcaseCapability[] = [
    {
      tag: 'TELEMETRY',
      title: 'Operational Visibility',
      description:
        'See performance, availability, and emerging risk in one live operational view. Fast updates turn subtle drift into an early warning before customers feel the impact.',
      icon: 'analytics',
      metrics: [
        { label: 'P99 Latency · 24h', key: 'p99', trend: 'down' },
        { label: 'Uptime · 30d', key: 'uptime', trend: 'stable' },
        { label: 'Requests · 24h', key: 'requests', trend: 'up' },
      ],
      linkHref: '/#docs',
      linkLabel: 'Review integration specifications →',
    },
    {
      tag: 'SECURITY',
      title: 'Threat Intelligence',
      description:
        'ML models score anomalies at ingress. Semgrep and Trivy findings consolidate into a unified triage board; high-confidence indicators serialize to STIX 2.1 for downstream SOAR and TAXII federation.',
      icon: 'security',
      metrics: [
        { label: 'Threats Detected · 24h', key: 'threats', trend: 'down' },
        { label: 'Threat Model', key: 'static', staticValue: 'Active', trend: 'stable' },
        { label: 'Public Scope', key: 'static', staticValue: 'Tenant0', trend: 'stable' },
      ],
      linkHref: '/login',
      authedHref: '/vulnerabilities',
      linkLabel: 'Activate threat monitoring →',
      authedLabel: 'Open threat operations →',
    },
    {
      tag: 'PIPELINE',
      title: 'Event Projections',
      description:
        'Every operational change is durable, replayable, and reflected across live views without losing history. The same reliable path protects every customer workspace.',
      icon: 'hub',
      metrics: [
        { label: 'Observed Requests · 24h', key: 'requests', trend: 'up' },
        { label: 'Outbox Delivery', key: 'static', staticValue: 'Durable', trend: 'stable' },
        { label: 'Tenants', key: 'static', staticValue: 'Symmetrical', trend: 'stable' },
      ],
      linkHref: '/status/platform-status',
      linkLabel: 'Observe live projections →',
    },
  ];

  protected readonly securityPillars = [
    {
      icon: 'lock',
      label: 'AES-256-GCM at rest',
      detail: 'Field-level encryption with KMS rotation every 90 days',
    },
    {
      icon: 'fingerprint',
      label: 'UUID isolation',
      detail: 'No sequential identifiers. No cross-tenant data paths.',
    },
    {
      icon: 'gpp_maybe',
      label: 'Behavioral enrichment',
      detail: 'ASN, ISP, and biometric signals at ingress',
    },
    {
      icon: 'verified_user',
      label: 'Zero-trust perimeter',
      detail: 'Verified identity and policy checks on every protected action',
    },
  ] as const;

  protected readonly docsSteps: DocsStep[] = [
    {
      title: 'Create an account',
      detail: 'Sign in with Firebase Auth, then open your dashboard workspace.',
      href: '/login',
    },
    {
      title: 'Explore public status',
      detail: 'Browse published status pages and the Tenant0 live projection.',
      href: '/explore',
    },
  ];

  protected readonly apiDocs: ApiDocLink[] = [
    {
      name: 'DEML API',
      detail: 'Control-plane OpenAPI — identity, billing, and sealed FORJD handoff.',
      swaggerHref: `${environment.backendUrl}/api/v1/docs`,
      redocHref: `${environment.backendUrl}/api/v1/redoc`,
    },
    {
      name: 'FORJD API',
      detail: 'Data-plane OpenAPI — sealed ingest, projections, replay, and ML.',
      swaggerHref: `${environment.forjdApiUrl}/docs`,
      redocHref: `${environment.forjdApiUrl}/redoc`,
    },
  ];

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      void this.hydratePlatformMetrics();
    }
  }

  protected metricValue(key: MetricKey, staticValue?: string): string {
    if (key === 'static') {
      return staticValue ?? '—';
    }
    if (key === 'p99') {
      return this.p99Value();
    }
    if (key === 'uptime') {
      return this.uptimeValue();
    }
    if (key === 'requests') {
      return this.requestsValue();
    }
    return this.threatsValue();
  }

  private async hydratePlatformMetrics(): Promise<void> {
    try {
      const metrics = await firstValueFrom(
        this.http.get<{
          p99_latency?: number;
          overall_uptime?: number;
          total_requests?: number;
          threats_detected_24h?: number;
        }>(`${this.backendUrl}/api/v1/system-status/status_pages/slug/platform-status`),
      );
      if (Number.isFinite(metrics.p99_latency)) {
        const ms = Math.round(metrics.p99_latency as number);
        this.p99Value.set(`${ms}ms`);
      }
      if (Number.isFinite(metrics.threats_detected_24h)) {
        const n = (metrics.threats_detected_24h as number).toLocaleString();
        this.threatsValue.set(n);
      }
      if (Number.isFinite(metrics.overall_uptime)) {
        this.uptimeValue.set(`${(metrics.overall_uptime as number).toFixed(2)}%`);
      }
      if (Number.isFinite(metrics.total_requests)) {
        this.requestsValue.set((metrics.total_requests as number).toLocaleString());
      }
    } catch {
      // Live Tenant0 metrics are optional on the public showcase.
    }
  }
}
