import {
  Component,
  OnInit,
  inject,
  ChangeDetectionStrategy,
  signal,
  ChangeDetectorRef,
  afterNextRender,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { MlService } from '../../services/ml.service';

export interface SOCCriteria {
  name: string;
  category: string;
  status: string;
  description: string;
  details: string;
}

export interface SOCStatusResponse {
  status: string;
  overall_score: number;
  criteria: SOCCriteria[];
  e2e_encryption?: {
    transit: string;
    rest: string;
    clientPayload: string;
    rotationDaysRemaining: number;
  };
}

@Component({
  selector: 'app-compliance',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, RouterModule],
  templateUrl: './compliance.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './compliance.scss',
})
export class Compliance implements OnInit {
  private mlService = inject(MlService);
  private cdr = inject(ChangeDetectorRef);
  private titleService = inject(Title);
  private metaService = inject(Meta);

  // Signals for page state
  socScore = signal<number>(0.0);
  socCriteria = signal<SOCCriteria[]>([
    {
      name: 'Security Control 1',
      category: 'Security',
      status: 'warning',
      description: 'Loading...',
      details: 'Waiting for telemetry...',
    },
    {
      name: 'Availability Control 1',
      category: 'Availability',
      status: 'warning',
      description: 'Loading...',
      details: 'Waiting for telemetry...',
    },
    {
      name: 'Confidentiality Control 1',
      category: 'Confidentiality',
      status: 'warning',
      description: 'Loading...',
      details: 'Waiting for telemetry...',
    },
  ]);
  stixPayload = signal<any>(null);
  selectedIsac = signal<string>('CISA');
  isSubmittingIsac = signal<boolean>(false);
  submissionResult = signal<any>(null);
  showSafetyWarning = signal<boolean>(true);

  // Details for E2E encryption status
  e2eEncryption = signal({
    transit: 'TLS 1.3 / SSL Encryption active on all connections',
    rest: 'KMS / AES-256 managed keys active on database volumes',
    clientPayload: 'Active payload signing & end-to-end telemetry integrity verification',
    rotationDaysRemaining: 0,
  });

  constructor() {
    afterNextRender(() => {
      this.loadComplianceData();
    });
  }

  ngOnInit() {
    this.titleService.setTitle('Security Compliance & Threat Reporting - Web Application');
    this.metaService.updateTag({
      name: 'description',
      content:
        'Audit SOC 2 readiness, view E2E encryption status, and export automated threat intelligence in CISA-standard STIX 2.1 format.',
    });
  }

  loadComplianceData() {
    // 1. Fetch SOC readiness status
    this.mlService.fetchSocStatus().subscribe({
      next: (data: SOCStatusResponse) => {
        if (data && data.status === 'success') {
          this.socScore.set(data.overall_score);
          this.socCriteria.set(data.criteria);
          if (data.e2e_encryption) {
            this.e2eEncryption.set(data.e2e_encryption);
          }
        }
        this.cdr.markForCheck();
      },
      error: err => console.error('Error fetching SOC status:', err),
    });

    // 2. Fetch STIX threat report
    this.mlService.fetchStixReport().subscribe({
      next: (data: any) => {
        this.stixPayload.set(data);
        this.cdr.markForCheck();
      },
      error: err => console.error('Error fetching STIX report:', err),
    });
  }

  submitThreatIntelligence() {
    this.isSubmittingIsac.set(true);
    this.submissionResult.set(null);
    this.cdr.markForCheck();

    this.mlService.submitToIsac(this.selectedIsac()).subscribe({
      next: (data: any) => {
        this.isSubmittingIsac.set(false);
        this.submissionResult.set(data);
        this.cdr.markForCheck();
      },
      error: err => {
        console.error('Error submitting threat intelligence:', err);
        this.isSubmittingIsac.set(false);
        this.submissionResult.set({
          status: 'error',
          message: 'Network error occurred. Failed to submit report.',
        });
        this.cdr.markForCheck();
      },
    });
  }

  changeIsacDestination(dest: string) {
    this.selectedIsac.set(dest);
    this.submissionResult.set(null);
    this.cdr.markForCheck();
  }

  dismissSafetyWarning() {
    this.showSafetyWarning.set(false);
    this.cdr.markForCheck();
  }
}
