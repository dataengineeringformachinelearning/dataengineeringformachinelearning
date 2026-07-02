import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  afterNextRender,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Title, Meta } from '@angular/platform-browser';
import { FluxChart, FluxButton, FluxBadge, FluxChartSeries } from '@deml/flux-material';
import { environment } from '../../../environments/environment';
import { VulnerabilityService, Vulnerability } from '../../services/vulnerability.service';
import { SettingsService } from '../../services/settings.service';
import { AuthService } from '../../services/auth.service';
import { MonitorService } from '../../services/monitor.service';
import { OnboardingService } from '../../services/onboarding.service';
import {
  UnifiedSelect,
  SelectOption,
} from '../../components/unified-select/unified-select.component';
import { FluxAppIcon } from '../../components/flux-app-icon/flux-app-icon';
import {
  FluxDonutSegment,
  hasChartValues,
  hasDonutValues,
  toFluxBarSeries,
  toFluxDonutSegments,
  toFluxLineSeries,
} from '../../core/chart-data.util';

type DashboardTab = 'overview' | 'performance' | 'security';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    UnifiedSelect,
    FluxChart,
    FluxButton,
    FluxBadge,
    FluxAppIcon,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private titleService = inject(Title);
  private metaService = inject(Meta);
  private cdr = inject(ChangeDetectorRef);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  public vulnService = inject(VulnerabilityService);
  public settingsService = inject(SettingsService);
  public authService = inject(AuthService);
  private monitorService = inject(MonitorService);
  private onboardingService = inject(OnboardingService);

  activeTab = signal<DashboardTab>('overview');
  isLoading = signal(true);

  latencySeries = signal<FluxChartSeries[]>(toFluxLineSeries('Latency (ms)', []));
  securityAlertSeries = signal<FluxChartSeries[]>(toFluxBarSeries('Anomalies', [], 'warning'));
  threatDonutSegments = signal<FluxDonutSegment[]>([]);

  // Analytics metrics
  threatLevel = 0;
  cesLevel = 0;
  stabilityLevel = 0;
  slaLevel = 0;
  p99Latency = 0;
  uptimePercent = 0;
  totalRequests = 0;
  activeIncidents = 0;
  uniqueVisitors = 0;

  selectedTenantId: string | null = null;
  selectedSite: string | null = null;
  tenantOptions: SelectOption[] = [];
  siteOptions: SelectOption[] = [{ value: 'All', label: 'All Sites' }];

  private intervalId: ReturnType<typeof setInterval> | undefined;

  openVulnCount = computed(
    () =>
      this.vulnService
        .vulnerabilities()
        .filter(v => v.status !== 'Resolved' && v.status !== 'False Positive').length,
  );

  criticalVulnCount = computed(
    () =>
      this.vulnService
        .vulnerabilities()
        .filter(v => v.severity === 'Critical' && v.status !== 'Resolved').length,
  );

  recentThreats = computed(() =>
    this.vulnService
      .vulnerabilities()
      .filter(v => v.status !== 'Resolved' && v.status !== 'False Positive')
      .slice(0, 6),
  );

  healthScore = computed(() => {
    const threatPenalty = Math.min(this.threatLevel, 100) * 0.35;
    const stabilityBonus = Math.min(this.stabilityLevel, 100) * 0.35;
    const vulnPenalty = Math.min(this.openVulnCount() * 8, 30);
    return Math.round(
      Math.max(0, Math.min(100, stabilityBonus + (100 - threatPenalty) * 0.3 - vulnPenalty + 15)),
    );
  });

  healthLabel = computed(() => {
    const score = this.healthScore();
    if (score >= 85) return 'Healthy';
    if (score >= 65) return 'Watch';
    if (score >= 40) return 'At Risk';
    return 'Critical';
  });

  myPages = computed(() => {
    const uid = this.authService.currentUserId();
    return this.settingsService
      .statusPages()
      .filter(p => p.user_id === uid && p.slug !== 'platform-status');
  });

  setupComplete = computed(() => this.myPages().length > 0);

  hasLatencyData = computed(() =>
    hasChartValues(this.latencySeries().flatMap(series => series.data)),
  );

  hasSecurityAlertData = computed(() =>
    hasChartValues(this.securityAlertSeries().flatMap(series => series.data)),
  );

  hasThreatDonutData = computed(() => hasDonutValues(this.threatDonutSegments()));

  constructor() {
    afterNextRender(() => {
      if (this.isBrowser) {
        this.loadTenants();
        this.loadUserPages();
      }
    });
  }

  ngOnInit() {
    this.titleService.setTitle('Dashboard - DEML');
    this.metaService.updateTag({
      name: 'description',
      content: 'Unified security and performance dashboard for your monitored sites.',
    });

    this.route.queryParamMap.subscribe(params => {
      const tab = params.get('tab') as DashboardTab | null;
      if (tab === 'performance' || tab === 'security' || tab === 'overview') {
        this.activeTab.set(tab);
      }
      if (params.get('setup') === '1' && this.isBrowser) {
        setTimeout(() => this.openOnboardingWizard(), 300);
      }
      this.cdr.markForCheck();
    });

    if (this.isBrowser) {
      this.intervalId = setInterval(() => this.refreshData(), 60000);
    }
  }

  ngOnDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  setTab(tab: DashboardTab) {
    this.activeTab.set(tab);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  openOnboardingWizard() {
    void this.onboardingService.openWizard()?.then(() => {
      this.loadUserPages(false);
      this.cdr.markForCheck();
    });
  }

  goToSettings() {
    void this.router.navigate(['/settings']);
  }

  private loadUserPages(autoOpenWizard = true) {
    this.monitorService.getStatusPages().subscribe({
      next: data => {
        if (Array.isArray(data)) {
          const uid = this.authService.currentUserId();
          const myPages = data.filter(p => p.user_id === uid && p.slug !== 'platform-status');
          this.settingsService.statusPages.set(myPages);
          if (autoOpenWizard && this.onboardingService.shouldAutoOpen(myPages.length > 0)) {
            setTimeout(() => this.openOnboardingWizard(), 400);
          }
        }
        this.cdr.markForCheck();
      },
    });
  }

  private refreshData() {
    this.loadAnalyticsData();
    this.vulnService.fetchVulnerabilities(
      this.selectedTenantId || undefined,
      this.selectedSite || undefined,
    );
  }

  private loadTenants() {
    this.http.get<any>(`${environment.backendUrl}/api/v1/analytics/tenants`).subscribe({
      next: response => {
        if (response.status === 'success' && response.data) {
          const tenants = response.data;
          this.tenantOptions = tenants.map((t: any) => ({
            value: t.id,
            label: t.is_platform ? `${t.name} (Global)` : t.name,
          }));
          if (!this.selectedTenantId && tenants.length > 0) {
            const userTenant = tenants.find((t: any) => !t.is_platform);
            this.selectedTenantId = userTenant ? userTenant.id : tenants[0].id;
          }
        }
        this.loadAnalyticsData();
        this.vulnService.fetchVulnerabilities(
          this.selectedTenantId || undefined,
          this.selectedSite || undefined,
        );
        this.vulnService.fetchIncidents(this.selectedTenantId || undefined);
      },
      error: () => {
        this.loadAnalyticsData();
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  private loadAnalyticsData() {
    this.isLoading.set(true);
    let url = `${environment.backendUrl}/api/v1/analytics/overview`;
    const params: string[] = [];
    if (this.selectedTenantId) params.push(`tenant_id=${this.selectedTenantId}`);
    if (this.selectedSite && this.selectedSite !== 'All') {
      params.push(`site_url=${encodeURIComponent(this.selectedSite)}`);
    }
    if (params.length > 0) url += '?' + params.join('&');

    this.http.get<any>(url).subscribe({
      next: response => {
        if (response.status === 'success' && response.data) {
          const { ces, user_metrics } = response.data;
          this.cesLevel = ces?.level || 0;
          this.threatLevel = ces?.threat || 0;
          this.slaLevel = ces?.sla || 0;
          this.stabilityLevel = ces?.stability || 0;
          this.p99Latency = user_metrics?.p99_latency_ms || 0;
          this.uptimePercent = user_metrics?.uptime_percent || 0;
          this.totalRequests = user_metrics?.total_requests_24h || 0;
          this.activeIncidents = user_metrics?.active_incidents || 0;
          this.uniqueVisitors = user_metrics?.unique_visitors || 0;

          if (user_metrics?.available_sites) {
            this.siteOptions = [
              { value: 'All', label: 'All Sites' },
              ...user_metrics.available_sites.map((site: string) => ({ value: site, label: site })),
            ];
          }

          const timeSeries = user_metrics?.time_series || [];
          this.latencySeries.set(
            toFluxLineSeries(
              'Latency (ms)',
              timeSeries.map((d: { latency: number }) => d.latency ?? 0),
            ),
          );

          const threats = user_metrics?.threat_severity || [];
          this.threatDonutSegments.set(
            toFluxDonutSegments(
              threats.map((d: { severity: string }) => d.severity),
              threats.map((d: { count: number }) => d.count ?? 0),
            ),
          );

          const alerts = user_metrics?.security_alerts || [];
          this.securityAlertSeries.set(
            toFluxBarSeries(
              'Anomalies',
              alerts.map((d: { count: number }) => d.count ?? 0),
              'warning',
            ),
          );
        }
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  onTenantChange(tenantId: string) {
    this.selectedTenantId = tenantId;
    this.selectedSite = 'All';
    this.refreshData();
  }

  onSiteChange(site: string) {
    this.selectedSite = site;
    this.refreshData();
  }

  getGaugeStroke(value: number, circumference: number): string {
    const dash = (value / 100) * circumference;
    return `${dash} ${circumference}`;
  }

  severityClass(severity: string): string {
    return severity.toLowerCase();
  }

  trackThreat(_index: number, threat: Vulnerability): string {
    return threat.id;
  }
}
