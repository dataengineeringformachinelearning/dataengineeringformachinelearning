import {
  Component,
  Input,
  ChangeDetectionStrategy,
  OnInit,
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

@Component({
  selector: 'app-status-card',
  standalone: true,
  imports: [CommonModule, RouterModule, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './status-card.html',
  styleUrl: './status-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusCard implements OnInit {
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
    // Hydrate data cleanly as requested
    setTimeout(
      () => {
        const baseSla = this.page.cumulative_sla ?? 99.9;
        // Simulate real-ish data based on SLA
        this.p99Latency = this.page.p99_latency ?? 0;
        this.totalRequests = this.page.total_requests ?? 0;
        this.uptimePercent = baseSla;
        this.simulatedThreatReport = {
          suspicious_ratio: 0,
          anomaly_score: 0,
        };
        this.cdr.markForCheck();
      },
      800 + Math.random() * 700,
    );
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
