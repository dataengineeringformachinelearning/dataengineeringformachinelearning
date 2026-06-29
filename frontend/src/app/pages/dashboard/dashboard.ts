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
  effect,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Title, Meta } from '@angular/platform-browser';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { NgApexchartsModule } from 'ng-apexcharts';
import { environment } from '../../../environments/environment';
import { VulnerabilityService, Vulnerability } from '../../services/vulnerability.service';
import { SettingsService } from '../../services/settings.service';
import { AuthService } from '../../services/auth.service';
import { MonitorService } from '../../services/monitor.service';
import { ThemeService } from '../../services/theme.service';
import { OnboardingService } from '../../services/onboarding.service';
import { MatDialogModule } from '@angular/material/dialog';
import {
  UnifiedSelect,
  SelectOption,
} from '../../components/unified-select/unified-select.component';

type DashboardTab = 'overview' | 'performance' | 'security';

interface ChartOptions {
  series: any;
  chart: any;
  xaxis?: any;
  yaxis?: any;
  dataLabels?: any;
  grid?: any;
  stroke?: any;
  plotOptions?: any;
  labels?: any;
  colors?: any;
  legend?: any;
  fill?: any;
  tooltip?: any;
  noData?: any;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    NgApexchartsModule,
    UnifiedSelect,
    MatDialogModule,
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
  private themeService = inject(ThemeService);
  public vulnService = inject(VulnerabilityService);
  public settingsService = inject(SettingsService);
  public authService = inject(AuthService);
  private monitorService = inject(MonitorService);
  private onboardingService = inject(OnboardingService);

  activeTab = signal<DashboardTab>('overview');
  isLoading = signal(true);

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

  chartOptions: ChartOptions;
  threatSeverityChartOptions: ChartOptions;
  securityAlertsChartOptions: ChartOptions;

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

  get isDarkMode(): boolean {
    return this.themeService.theme() === 'dark';
  }

  constructor() {
    this.chartOptions = this.getEmptyAreaChart('var(--crayola-blue)', 'Latency (ms)');
    this.threatSeverityChartOptions = this.getEmptyDonutChart();
    this.securityAlertsChartOptions = this.getEmptyBarChart('var(--carrot-orange)', 'Anomalies');

    effect(() => {
      this.themeService.theme();
      this.updateChartTheme();
    });

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
    const ref = this.onboardingService.openWizard();
    if (!ref) return;
    ref.afterClosed().subscribe(() => {
      this.loadUserPages(false);
      this.cdr.markForCheck();
    });
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
          this.chartOptions.series = [
            { name: 'Latency (ms)', data: timeSeries.map((d: any) => d.latency) },
          ];
          this.chartOptions.xaxis.categories = timeSeries.map((d: any) => d.time);

          const threats = user_metrics?.threat_severity || [];
          this.threatSeverityChartOptions.series = threats.map((d: any) => d.count);
          this.threatSeverityChartOptions.labels = threats.map((d: any) => d.severity);

          const alerts = user_metrics?.security_alerts || [];
          this.securityAlertsChartOptions.series = [
            { name: 'Anomalies', data: alerts.map((d: any) => d.count) },
          ];
          this.securityAlertsChartOptions.xaxis.categories = alerts.map((d: any) => d.time);

          this.updateChartTheme();
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

  hasData(options: ChartOptions): boolean {
    if (!options?.series) return false;
    if (options.chart?.type === 'donut') {
      return (options.series as number[]).some(v => v > 0);
    }
    return options.series.length > 0;
  }

  severityClass(severity: string): string {
    return severity.toLowerCase();
  }

  trackThreat(_index: number, threat: Vulnerability): string {
    return threat.id;
  }

  private getEmptyAreaChart(color: string, seriesName: string): ChartOptions {
    const zeroData = Array(24).fill(0);
    const now = new Date();
    const categories = Array(24)
      .fill('')
      .map((_, i) => {
        const d = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
        return d.getHours() + ':00';
      });

    return {
      series: [{ name: seriesName, data: zeroData }],
      chart: {
        type: 'area',
        height: '100%',
        width: '100%',
        toolbar: { show: false },
        background: 'transparent',
      },
      colors: [color],
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 2 },
      xaxis: { type: 'category', categories },
      yaxis: {},
      grid: { show: true },
      tooltip: {},
      noData: { text: 'No data yet' },
    };
  }

  private getEmptyBarChart(color: string, seriesName: string): ChartOptions {
    return {
      series: [{ name: seriesName, data: Array(24).fill(0) }],
      chart: {
        type: 'bar',
        height: '100%',
        width: '100%',
        toolbar: { show: false },
        background: 'transparent',
      },
      colors: [color],
      dataLabels: { enabled: false },
      xaxis: { type: 'category', categories: [] },
      yaxis: {},
      grid: { show: true },
      tooltip: {},
      noData: { text: 'No data yet' },
    };
  }

  private getEmptyDonutChart(): ChartOptions {
    return {
      series: [0, 0, 0, 0],
      chart: { type: 'donut', height: '100%', width: '100%', background: 'transparent' },
      labels: ['Low', 'Medium', 'High', 'Critical'],
      colors: [
        'var(--crayola-blue)',
        'var(--blue-bell)',
        'var(--golden-pollen)',
        'var(--carrot-orange)',
      ],
      plotOptions: { pie: { donut: { size: '70%' } } },
      dataLabels: { enabled: false },
      legend: { position: 'bottom' },
      tooltip: {},
      noData: { text: 'No data yet' },
    };
  }

  private updateChartTheme() {
    const textColor = this.isDarkMode ? 'rgba(255, 255, 255, 0.4)' : 'rgba(15, 23, 42, 0.4)';
    const gridColor = this.isDarkMode ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.06)';

    [this.chartOptions, this.securityAlertsChartOptions, this.threatSeverityChartOptions].forEach(
      opts => {
        if (opts.xaxis) opts.xaxis.labels = { style: { colors: textColor } };
        if (opts.yaxis) opts.yaxis.labels = { style: { colors: textColor } };
        if (opts.grid) opts.grid.borderColor = gridColor;
        if (opts.tooltip) opts.tooltip.theme = this.isDarkMode ? 'dark' : 'light';
        if (opts.legend) opts.legend.labels = { colors: textColor };
      },
    );
  }
}
