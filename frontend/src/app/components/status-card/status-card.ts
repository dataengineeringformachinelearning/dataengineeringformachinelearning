import {
  ChangeDetectionStrategy,
  Component,
  Input,
  ChangeDetectorRef,
  OnInit,
  OnChanges,
  SimpleChanges,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  VikingButton,
  VikingCard,
  VikingChart,
  VikingHeading,
  VikingStatusCard,
  VikingStatusMetricRow,
  VikingStatusPanel,
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
    VikingStatusPanel,
    VikingStatusPill,
    VikingUptimeHistory,
    ProVerifiedBadge,
  ],
  templateUrl: './status-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusCard implements OnInit, OnChanges {
  @Input({ required: true }) page!: StatusPageData;
  @Input({ required: true }) services: MonitoredServiceData[] = [];
  @Input() predictedSla: number | null | undefined = null;
  @Input() predictedTemporalForecast: number | null | undefined = null;
  @Input() usesNorse: boolean | null | undefined = null;
  @Input() threatReport: ThreatReportResponse | null = null;
  @Input() incidents: IncidentData[] = [];
  @Input() showViewButton = false;
  @Input() showIncidents = false;
  @Input() linkHeader = false;
  @Input() variant: StatusCardVariant = 'full';

  readonly cdr = inject(ChangeDetectorRef);

  get isCompact(): boolean {
    return this.variant === 'compact';
  }

  getPageStatus(): string {
    const active = (this.incidents || []).filter(i => i.status !== 'Resolved');
    if (active.length > 0) {
      return active[0].status;
    }
    return 'Operational';
  }

  get statusTone(): 'accent' | 'success' | 'warning' | 'danger' | 'muted' {
    const status = this.getPageStatus().toLowerCase();
    if (status === 'operational') return 'success';
    if (status === 'degraded' || status === 'maintenance') return 'warning';
    if (status === 'outage' || status === 'major outage') return 'danger';
    return 'muted';
  }

  get p99Latency(): number {
    return this.page?.p99_latency ?? 0;
  }

  get totalRequests(): number {
    return this.page?.total_requests ?? 0;
  }

  get cumulativeSla(): number {
    return this.page?.cumulative_sla ?? 0;
  }

  get predictedSlaValue(): number {
    return this.predictedSla ?? 0;
  }

  get predictedTemporalForecastValue(): number {
    return this.predictedTemporalForecast ?? 0;
  }

  get norseSnnLabel(): string {
    if (this.usesNorse === true) return 'Active';
    if (this.usesNorse === false) return 'MLP Fallback';
    return 'Pending';
  }

  get suspiciousRatio(): number {
    return this.threatReport?.suspicious_ratio ?? 0;
  }

  get anomalyScore(): number {
    return this.threatReport?.anomaly_score ?? 0;
  }

  get overallUptime(): number {
    return this.page?.overall_uptime ?? this.cumulativeSla;
  }

  get uptimeSummary(): string {
    const status = this.getPageStatus().toLowerCase();
    if (status === 'operational') return 'No current issues';
    return this.getPageStatus();
  }

  get latencyChartSeries(): VikingChartSeries[] {
    const history = this.page?.uptime_history ?? [];
    const values = history.map(day => day.uptime ?? 100);
    if (values.length === 0) {
      return [
        {
          name: 'Availability',
          tone: 'accent',
          data: [100, 100, 100, 100, 100, 100, 100],
        },
      ];
    }
    return [
      {
        name: 'Availability',
        tone: 'accent',
        data: values,
      },
    ];
  }

  serviceStatusTone(status?: string | null): 'accent' | 'success' | 'warning' | 'danger' | 'muted' {
    const value = (status || 'Operational').toLowerCase();
    if (value === 'outage' || value === 'major outage') return 'danger';
    if (value === 'degraded' || value === 'maintenance') return 'warning';
    if (value === 'operational') return 'success';
    return 'muted';
  }

  getPageUrl(): string {
    return `/status/${this.page.slug}`;
  }

  get activeIncidents(): IncidentData[] {
    return (this.incidents || []).filter(i => i.status !== 'Resolved');
  }

  ngOnInit() {
    this.cdr.markForCheck();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['page'] || changes['incidents'] || changes['threatReport']) {
      this.cdr.markForCheck();
    }
  }
}
