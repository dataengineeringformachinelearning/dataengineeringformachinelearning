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
import { environment } from '../../../environments/environment';
import {
  ContinuityHealthSignal,
  continuityFromReady,
} from '../../core/continuity-health';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';

type MetricKey = 'p99' | 'uptime' | 'requests' | 'threats' | 'static';

type ShowcaseMetric = {
  label: string;
  key: MetricKey;
  staticValue?: string;
};

type ShowcaseCapability = {
  tag: string;
  title: string;
  description: string;
  panelTitle: string;
  metrics: ShowcaseMetric[];
  linkHref: string;
  linkLabel: string;
  authedHref?: string;
  authedLabel?: string;
};

// --- Public DEML product showcase (suite-landing parity with forjd.co) ---
@Component({
  selector: 'app-product-home',
  standalone: true,
  imports: [RouterLink],
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
  protected readonly demlDocsUrl = `${environment.backendUrl}/api/v1/docs`;
  protected readonly demlRedocUrl = `${environment.backendUrl}/api/v1/redoc`;
  protected readonly forjdDocsUrl = `${environment.forjdApiUrl}/docs`;
  protected readonly version = environment.version;
  protected readonly isAuthenticated = this.auth.isAuthenticated;

  protected readonly p99Value = signal('—');
  protected readonly uptimeValue = signal('—');
  protected readonly requestsValue = signal('—');
  protected readonly threatsValue = signal('—');
  /** Shared continuity signal: DEML `/api/v1/ready` (+ soft FORJD health). */
  protected readonly controlPlaneReady = signal<ContinuityHealthSignal>('checking');

  protected readonly quickStartSteps = [
    {
      step: '01',
      title: 'Connect',
      description: 'Deploy one script tag or API key. No agent fleet to maintain.',
    },
    {
      step: '02',
      title: 'Observe',
      description: 'Telemetry, threat scores, and CVE posture surface in real time.',
    },
    {
      step: '03',
      title: 'Act',
      description: 'Triage incidents, contain anomalies, and sustain operational tempo.',
    },
    {
      step: '04',
      title: 'Scale',
      description: 'Symmetrical pipelines for every tenant. Zero per-customer overhead.',
    },
  ] as const;

  protected readonly capabilities: ShowcaseCapability[] = [
    {
      tag: 'TELEMETRY',
      title: 'Operational Visibility',
      description:
        'See performance, availability, and emerging risk in one live operational view. Fast updates turn subtle drift into an early warning before customers feel the impact.',
      panelTitle: 'Live signals',
      metrics: [
        { label: 'P99 Latency · 24h', key: 'p99' },
        { label: 'Uptime · 30d', key: 'uptime' },
        { label: 'Requests · 24h', key: 'requests' },
      ],
      linkHref: '/explore',
      linkLabel: 'Explore public status →',
    },
    {
      tag: 'SECURITY',
      title: 'Threat Intelligence',
      description:
        'ML models score anomalies at ingress. Semgrep and Trivy findings consolidate into a unified triage board; high-confidence indicators serialize to STIX 2.1 for downstream SOAR and TAXII federation.',
      panelTitle: 'Threat posture',
      metrics: [
        { label: 'Threats Detected · 24h', key: 'threats' },
        { label: 'Threat Model', key: 'static', staticValue: 'Active' },
        { label: 'Public Scope', key: 'static', staticValue: 'Tenant0' },
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
      panelTitle: 'Projection path',
      metrics: [
        { label: 'Observed Requests · 24h', key: 'requests' },
        { label: 'Outbox Delivery', key: 'static', staticValue: 'Durable' },
        { label: 'Tenants', key: 'static', staticValue: 'Symmetrical' },
      ],
      linkHref: '/status/platform-status',
      linkLabel: 'Observe live projections →',
    },
  ];

  protected readonly securityPillars = [
    {
      label: 'AES-256-GCM at rest',
      detail: 'Field-level encryption with KMS rotation every 90 days',
    },
    {
      label: 'UUID isolation',
      detail: 'No sequential identifiers. No cross-tenant data paths.',
    },
    {
      label: 'Behavioral enrichment',
      detail: 'ASN, ISP, and biometric signals at ingress',
    },
    {
      label: 'Zero-trust perimeter',
      detail: 'Verified identity and policy checks on every protected action',
    },
  ] as const;

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      void this.probeControlPlaneReady();
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

  private async probeControlPlaneReady(): Promise<void> {
    try {
      const ready = await firstValueFrom(
        this.http
          .get<{ forjd_health?: string; mode?: string; status?: string }>(
            `${this.backendUrl}/api/v1/ready`,
          )
          .pipe(timeout(2500)),
      );
      this.controlPlaneReady.set(continuityFromReady(ready));
    } catch {
      this.controlPlaneReady.set('unreachable');
      console.warn('[product-home] control-plane /ready unreachable');
    }
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
      // Showcase metrics are optional — keep dashes, never invent "Live" KPIs.
      console.warn('[product-home] platform-status metrics unavailable');
      this.p99Value.set('—');
      this.uptimeValue.set('—');
      this.requestsValue.set('—');
      this.threatsValue.set('—');
    }
  }
}
