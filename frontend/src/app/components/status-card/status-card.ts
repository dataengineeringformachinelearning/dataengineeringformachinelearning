import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  VikingButton,
  VikingCard,
  VikingChart,
  VikingHeading,
  VikingStatusCard,
  VikingStatusMetricRow,
  VikingStatusPill,
  VikingUptimeHistory,
} from '@dataengineeringformachinelearning/viking-ui';
import type { VikingChartSeries } from '@dataengineeringformachinelearning/viking-ui';

import { StatusPageData, MonitoredServiceData, IncidentData } from '../../services/monitor.service';
import { ThreatReportResponse } from '../../services/ml.service';
import { ProVerifiedBadge } from '../pro-verified-badge/pro-verified-badge';

export type StatusCardVariant = 'compact' | 'full';

@Component({
  selector: 'app-status-card',
  standalone: true,
  imports: [
    CommonModule,
    VikingButton,
    VikingCard,
    VikingChart,
    VikingHeading,
    VikingStatusCard,
    VikingStatusMetricRow,
    VikingStatusPill,
    VikingUptimeHistory,
    ProVerifiedBadge,
  ],
  templateUrl: './status-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusCard {
  readonly page = input.required<StatusPageData>();
  readonly services = input<MonitoredServiceData[]>([]);
  readonly predictedSla = input<number | null | undefined>(null);
  readonly predictedTemporalForecast = input<number | null | undefined>(null);
  readonly usesNorse = input<boolean | null | undefined>(null);
  readonly threatReport = input<ThreatReportResponse | null>(null);
  readonly incidents = input<IncidentData[]>([]);
  readonly showViewButton = input(false);
  readonly showIncidents = input(false);
  readonly linkHeader = input(false);
  readonly variant = input<StatusCardVariant>('full');

  readonly isCompact = computed(() => this.variant() === 'compact');

  readonly pageStatus = computed(() => {
    const active = (this.incidents() || []).filter(i => i.status !== 'Resolved');
    if (active.length > 0) return active[0].status;
    return 'Operational';
  });

  readonly statusTone = computed<'accent' | 'success' | 'warning' | 'danger' | 'muted'>(() => {
    const status = this.pageStatus().toLowerCase();
    if (status === 'operational') return 'success';
    if (status === 'degraded' || status === 'maintenance') return 'warning';
    if (status === 'outage' || status === 'major outage') return 'danger';
    return 'muted';
  });

  readonly p99Latency = computed(() => this.page()?.p99_latency ?? 0);
  readonly totalRequests = computed(() => this.page()?.total_requests ?? 0);
  readonly cumulativeSla = computed(() => this.page()?.cumulative_sla ?? 0);
  readonly predictedSlaValue = computed(() => this.predictedSla() ?? 0);
  readonly predictedTemporalForecastValue = computed(() => this.predictedTemporalForecast() ?? 0);

  readonly norseSnnLabel = computed(() => {
    const usesNorse = this.usesNorse();
    if (usesNorse === true) return 'Active';
    if (usesNorse === false) return 'MLP Fallback';
    return 'Pending';
  });

  readonly suspiciousRatio = computed(() => this.threatReport()?.suspicious_ratio ?? 0);
  readonly anomalyScore = computed(() => this.threatReport()?.anomaly_score ?? 0);
  readonly overallUptime = computed(() => this.page()?.overall_uptime ?? this.cumulativeSla());

  readonly uptimeSummary = computed(() => {
    const status = this.pageStatus().toLowerCase();
    if (status === 'operational') return 'No current issues';
    return this.pageStatus();
  });

  readonly latencyChartSeries = computed<VikingChartSeries[]>(() => {
    const history = this.page()?.uptime_history ?? [];
    const values = history
      .filter(day => day.status !== 'no_data' && day.uptime !== null)
      .map(day => day.uptime as number);
    if (values.length === 0) {
      return [{ name: 'Availability', tone: 'accent', data: [] }];
    }
    return [{ name: 'Availability', tone: 'accent', data: values }];
  });

  readonly pageUrl = computed(() => `/status/${this.page().slug}`);

  readonly activeIncidents = computed(() =>
    (this.incidents() || []).filter(i => i.status !== 'Resolved'),
  );

  serviceStatusTone(status?: string | null): 'accent' | 'success' | 'warning' | 'danger' | 'muted' {
    const value = (status || 'Operational').toLowerCase();
    if (value === 'outage' || value === 'major outage') return 'danger';
    if (value === 'degraded' || value === 'maintenance') return 'warning';
    if (value === 'operational') return 'success';
    return 'muted';
  }
}
