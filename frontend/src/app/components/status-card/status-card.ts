import {
  Component,
  Input,
  ChangeDetectionStrategy,
  OnInit,
  OnChanges,
  SimpleChanges,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { StatusPageData, MonitoredServiceData, IncidentData } from '../../services/monitor.service';
import { ThreatReportResponse } from '../../services/ml.service';
import { formatServiceName } from '../../core/utils/formatter.utils';
import { ProVerifiedBadge } from '../pro-verified-badge/pro-verified-badge';

@Component({
  selector: 'app-status-card',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    ProVerifiedBadge,
  ],
  templateUrl: './status-card.html',
  styleUrl: './status-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusCard implements OnInit, OnChanges {
  @Input({ required: true }) page!: StatusPageData;
  @Input({ required: true }) services: MonitoredServiceData[] = [];
  @Input() predictedSla: number | null | undefined = null;
  @Input() threatReport: ThreatReportResponse | null = null;
  @Input() incidents: IncidentData[] = [];
  @Input() showViewButton = false;
  @Input() showIncidents = false;
  @Input() linkHeader = false;

  // Analytics local state
  public p99Latency?: number = 0;
  public totalRequests?: number = 0;
  public uptimePercent?: number = 0;
  public simulatedThreatReport?: { suspicious_ratio: number; anomaly_score: number } = {
    suspicious_ratio: 0,
    anomaly_score: 0,
  };

  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    this.syncDerivedMetrics();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['page']) {
      this.syncDerivedMetrics();
    }
  }

  private syncDerivedMetrics() {
    this.p99Latency = this.page?.p99_latency ?? 0;
    this.totalRequests = this.page?.total_requests ?? 0;
    this.uptimePercent = this.page?.cumulative_sla ?? 99.9;
    this.simulatedThreatReport = {
      suspicious_ratio: 0,
      anomaly_score: 0,
    };
    this.cdr.markForCheck();
  }

  formatServiceName = formatServiceName;

  getPageStatus(): string {
    const active = (this.incidents || []).filter(i => i.status !== 'Resolved');
    if (active.length > 0) {
      return active[0].status;
    }
    return 'Operational';
  }

  getPageStatusClass(): string {
    const status = this.getPageStatus();
    if (status === 'Operational') return 'operational';
    return status.toLowerCase();
  }
}
