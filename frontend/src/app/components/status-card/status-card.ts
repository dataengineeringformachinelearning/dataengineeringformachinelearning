import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
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
export class StatusCard {
  @Input({ required: true }) page!: StatusPageData;
  @Input({ required: true }) services: MonitoredServiceData[] = [];
  @Input() predictedSla: number | null | undefined = null;
  @Input() threatReport: ThreatReportResponse | null = null;
  @Input() incidents: IncidentData[] = [];
  @Input() showViewButton = false;
  @Input() showIncidents = false;
  @Input() linkHeader = false;

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
