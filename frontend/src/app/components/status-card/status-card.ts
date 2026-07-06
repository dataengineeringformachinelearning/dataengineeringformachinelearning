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
  VikingStatusCard,
  VikingStatusMetricRow,
  VikingStatusPill,
} from '@dataengineeringformachinelearning/viking-ui';

import { StatusPageData, MonitoredServiceData, IncidentData } from '../../services/monitor.service';
import { ThreatReportResponse } from '../../services/ml.service';
import { ProVerifiedBadge } from '../pro-verified-badge/pro-verified-badge';

@Component({
  selector: 'app-status-card',
  standalone: true,
  imports: [
    CommonModule,
    VikingButton,
    VikingCard,
    VikingStatusCard,
    VikingStatusMetricRow,
    VikingStatusPill,
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
  @Input() threatReport: ThreatReportResponse | null = null;
  @Input() incidents: IncidentData[] = [];
  @Input() showViewButton = false;
  @Input() showIncidents = false;
  @Input() linkHeader = false;

  readonly cdr = inject(ChangeDetectorRef);

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
    if (status === 'degraded') return 'warning';
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

  get suspiciousRatio(): number {
    return this.threatReport?.suspicious_ratio ?? 0;
  }

  get anomalyScore(): number {
    return this.threatReport?.anomaly_score ?? 0;
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
