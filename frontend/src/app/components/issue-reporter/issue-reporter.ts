import { ChangeDetectionStrategy, Component, signal, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import {
  VikingButton,
  VikingCallout,
  VikingFab,
  VikingModal,
  VikingText,
  VikingTextarea,
} from '@dataengineeringformachinelearning/viking-ui';
import { API_ENDPOINTS } from '../../core/constants/api.constants';

@Component({
  selector: 'app-issue-reporter',
  imports: [
    FormsModule,
    VikingFab,
    VikingModal,
    VikingText,
    VikingTextarea,
    VikingCallout,
    VikingButton,
  ],
  templateUrl: './issue-reporter.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueReporter {
  isOpen = signal(false);
  isSubmitting = signal(false);
  issueDescription = signal('');
  submissionStatus = signal<'idle' | 'success' | 'error'>('idle');

  // Track only error classes; never capture console values or error messages.
  private recentErrors: string[] = [];
  private pendingClientReportId: string | null = null;

  constructor(private http: HttpClient) {}

  private recordErrorClass(value: unknown): void {
    // Never serialize console arguments/messages: they commonly contain URLs,
    // auth responses, form values, or arbitrary nested application objects.
    const name =
      value instanceof Error && /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(value.name)
        ? value.name
        : 'ClientError';
    this.recentErrors.push(`Error:${name}`);
    if (this.recentErrors.length > 5) {
      this.recentErrors.shift();
    }
  }

  @HostListener('window:error', ['$event'])
  onWindowError(event: ErrorEvent): void {
    this.recordErrorClass(event.error);
  }

  @HostListener('window:unhandledrejection', ['$event'])
  onUnhandledRejection(event: PromiseRejectionEvent): void {
    this.recordErrorClass(event.reason);
  }

  @HostListener('window:openBugReporter')
  onOpenBugReporter() {
    this.openModal();
  }

  toggleModal() {
    this.isOpen.update(v => !v);
    if (this.isOpen()) {
      // Reset form on open
      this.issueDescription.set('');
      this.submissionStatus.set('idle');
    }
  }

  openModal() {
    if (!this.isOpen()) {
      this.isOpen.set(true);
      this.issueDescription.set('');
      this.submissionStatus.set('idle');
      this.isSubmitting.set(false);
    }
  }

  closeModal() {
    if (this.isOpen()) {
      this.isOpen.set(false);
    }
  }

  submitIssue() {
    if (!this.issueDescription().trim()) return;

    this.isSubmitting.set(true);
    this.pendingClientReportId ??= crypto.randomUUID();

    const payload = {
      client_report_id: this.pendingClientReportId,
      user_description: this.issueDescription(),
      telemetry_context: {
        // Query strings and fragments often contain OAuth/reset/session tokens.
        route: window.location.pathname,
        userAgent: navigator.userAgent,
        recentErrors: this.recentErrors,
      },
    };

    this.http.post(API_ENDPOINTS.AGENT.REPORT_ISSUE, payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.submissionStatus.set('success');
        this.pendingClientReportId = null;
        setTimeout(() => this.closeModal(), 2000); // Close after 2s
      },
      error: err => {
        console.error('Failed to submit issue', err);
        this.isSubmitting.set(false);
        this.submissionStatus.set('error');
      },
    });
  }
}
