import { Component, signal, HostListener } from '@angular/core';
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
})
export class IssueReporter {
  isOpen = signal(false);
  isSubmitting = signal(false);
  issueDescription = signal('');
  submissionStatus = signal<'idle' | 'success' | 'error'>('idle');

  // Track the last few console errors as default telemetry context
  private recentErrors: string[] = [];

  constructor(private http: HttpClient) {
    this.captureConsoleErrors();
  }

  private captureConsoleErrors() {
    const originalError = console.error;
    console.error = (...args) => {
      this.recentErrors.push(args.join(' '));
      // Keep only the last 5 errors
      if (this.recentErrors.length > 5) {
        this.recentErrors.shift();
      }
      originalError.apply(console, args);
    };
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

    const payload = {
      user_description: this.issueDescription(),
      telemetry_context: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        recentErrors: this.recentErrors,
      },
    };

    this.http.post(API_ENDPOINTS.AGENT.REPORT_ISSUE, payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.submissionStatus.set('success');
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
