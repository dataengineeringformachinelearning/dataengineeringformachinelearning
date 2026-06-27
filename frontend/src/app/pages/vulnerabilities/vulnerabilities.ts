import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  afterNextRender,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import {
  UnifiedSelect,
  SelectOption,
} from '../../components/unified-select/unified-select.component';
import { FormsModule } from '@angular/forms';
import { Title, Meta } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

import { VulnerabilityService, Vulnerability } from '../../services/vulnerability.service';

@Component({
  selector: 'app-vulnerabilities',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule, FormsModule, UnifiedSelect],
  templateUrl: './vulnerabilities.html',
  styleUrl: './vulnerabilities.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Vulnerabilities implements OnInit {
  public vulnService = inject(VulnerabilityService);
  private titleService = inject(Title);
  private metaService = inject(Meta);
  private cdr = inject(ChangeDetectorRef);
  private http = inject(HttpClient);

  public tenants: any[] = [];
  public tenantOptions: SelectOption[] = [];
  public selectedTenantId: string | null = null;
  public availableSites: string[] = [];
  public siteOptions: SelectOption[] = [{ value: 'All', label: 'All Sites' }];
  public selectedSite: string | null = null;

  incidents = this.vulnService.incidents;
  playbooks = this.vulnService.playbooks;

  selectedVuln = signal<Vulnerability | null>(null);
  filterStatus = signal<string>('All');
  filterSeverity = signal<string>('All');

  // Statuses and Severities for filters/options
  statusOptions: SelectOption[] = [
    { value: 'All', label: 'All Statuses' },
    { value: 'Triage', label: 'Triage' },
    { value: 'Open', label: 'Open' },
    { value: 'In Progress', label: 'In Progress' },
    { value: 'Resolved', label: 'Resolved' },
    { value: 'False Positive', label: 'False Positive' },
  ];

  severityOptions: SelectOption[] = [
    { value: 'All', label: 'All Severities' },
    { value: 'Low', label: 'Low' },
    { value: 'Medium', label: 'Medium' },
    { value: 'High', label: 'High' },
    { value: 'Critical', label: 'Critical' },
  ];

  // Matrix axes values (1 to 3 representation for 3x3)
  matrixAxes = [1, 2, 3];

  filteredVulnerabilities = computed(() => {
    const list = this.vulnService.vulnerabilities();
    const stat = this.filterStatus();
    const sev = this.filterSeverity();

    return list.filter(v => {
      const matchStatus = stat === 'All' || v.status === stat;
      const matchSeverity = sev === 'All' || v.severity === sev;
      return matchStatus && matchSeverity;
    });
  });

  // Calculate stats for the HUD banner
  totalCount = computed(() => this.vulnService.vulnerabilities().length);
  openCount = computed(
    () =>
      this.vulnService
        .vulnerabilities()
        .filter(v => v.status !== 'Resolved' && v.status !== 'False Positive').length,
  );
  criticalCount = computed(
    () =>
      this.vulnService
        .vulnerabilities()
        .filter(v => v.severity === 'Critical' && v.status !== 'Resolved').length,
  );

  constructor() {
    afterNextRender(() => {
      this.loadTenants();
    });
  }

  ngOnInit() {
    this.titleService.setTitle('Threat Matrix & Vulnerability Center - Platform Status');
    this.metaService.updateTag({
      name: 'description',
      content:
        'Palantir-style vulnerability ingestion, analysis, and threat prioritization dashboard.',
    });
  }

  loadTenants() {
    this.http.get<any>(`${environment.backendUrl}/api/v1/analytics/tenants`).subscribe({
      next: response => {
        if (response.status === 'success' && response.data) {
          this.tenants = response.data;
          this.tenantOptions = this.tenants.map(t => ({
            value: t.id,
            label: `${t.name} ${t.is_platform ? '(Platform)' : ''}`.trim(),
          }));
          if (!this.selectedTenantId && this.tenants.length > 0) {
            const platformTenant = this.tenants.find((t: any) => t.is_platform);
            this.selectedTenantId = platformTenant ? platformTenant.id : this.tenants[0].id;
          }
          this.loadAvailableSites();
          this.loadVulnerabilities();
          this.vulnService.fetchIncidents(this.selectedTenantId || undefined);
          this.vulnService.fetchPlaybooks(this.selectedTenantId || undefined);
          this.cdr.markForCheck();
        }
      },
      error: err => console.error('Failed to load tenants', err),
    });
  }

  loadAvailableSites() {
    let url = `${environment.backendUrl}/api/v1/analytics/overview`;
    if (this.selectedTenantId) {
      url += `?tenant_id=${this.selectedTenantId}`;
    }
    this.http.get<any>(url).subscribe({
      next: response => {
        if (response.status === 'success' && response.data) {
          const { user_metrics } = response.data;
          if (user_metrics?.available_sites) {
            this.availableSites = user_metrics.available_sites;
            this.siteOptions = [
              { value: 'All', label: 'All Sites' },
              ...this.availableSites.map(site => ({ value: site, label: site })),
            ];
          } else {
            this.availableSites = [];
            this.siteOptions = [{ value: 'All', label: 'All Sites' }];
          }
          this.cdr.markForCheck();
        }
      },
      error: err => console.error('Failed to load sites for tenant', err),
    });
  }

  public onTenantChange(tenantId: any) {
    this.selectedTenantId = tenantId;
    this.selectedSite = 'All'; // reset site selection when tenant changes
    this.loadAvailableSites();
    this.loadVulnerabilities();
    this.vulnService.fetchIncidents(this.selectedTenantId || undefined);
    this.vulnService.fetchPlaybooks(this.selectedTenantId || undefined);
  }

  public onSiteChange(site: any) {
    this.selectedSite = site;
    this.loadVulnerabilities();
  }

  loadVulnerabilities() {
    this.vulnService.fetchVulnerabilities(
      this.selectedTenantId || undefined,
      this.selectedSite || undefined,
    );
    // Select first item by default if available after load
    setTimeout(() => {
      const list = this.vulnService.vulnerabilities();
      if (list.length > 0 && !this.selectedVuln()) {
        this.selectVulnerability(list[0]);
      }
      this.cdr.markForCheck();
    }, 800);
  }

  selectVulnerability(vuln: Vulnerability) {
    this.selectedVuln.set(vuln);
    this.cdr.markForCheck();
  }

  // Set grid parameters
  setMatrixCell(impact: number, likelihood: number) {
    const current = this.selectedVuln();
    if (!current) return;

    // Calculate score
    const score = impact * likelihood;
    let newSeverity: string;
    if (score <= 2) {
      newSeverity = 'Low';
    } else if (score <= 4) {
      newSeverity = 'Medium';
    } else if (score <= 6) {
      newSeverity = 'High';
    } else {
      newSeverity = 'Critical';
    }

    this.vulnService
      .updateVulnerability(current.id, {
        impact,
        likelihood,
        severity: newSeverity,
      })
      .subscribe({
        next: updated => {
          this.selectedVuln.set(updated);
          // Refresh full list to keep UI synchronized
          this.vulnService.fetchVulnerabilities();
          this.cdr.markForCheck();
        },
        error: err => console.error('Failed to update vulnerability matrix:', err),
      });
  }

  updateStatus(status: string) {
    const current = this.selectedVuln();
    if (!current) return;

    this.vulnService.updateVulnerability(current.id, { status }).subscribe({
      next: updated => {
        this.selectedVuln.set(updated);
        this.vulnService.fetchVulnerabilities(
          this.selectedTenantId || undefined,
          this.selectedSite || undefined,
        );
        this.cdr.markForCheck();
      },
      error: err => console.error('Failed to update status:', err),
    });
  }

  togglePlaybook(playbook: any) {
    this.vulnService.updatePlaybook(playbook.id, { is_active: !playbook.is_active }).subscribe({
      next: () => {
        this.vulnService.fetchPlaybooks(this.selectedTenantId || undefined);
      },
    });
  }

  // Helpers to get matrix cell color label
  getCellColor(impact: number, likelihood: number): string {
    const score = impact * likelihood;
    if (score <= 2) return 'low';
    if (score <= 4) return 'medium';
    if (score <= 6) return 'high';
    return 'critical';
  }

  getTelemetryJson(vuln: Vulnerability): string {
    if (!vuln.telemetry_context) return 'No diagnostic data provided.';
    return JSON.stringify(vuln.telemetry_context, null, 2);
  }
}
