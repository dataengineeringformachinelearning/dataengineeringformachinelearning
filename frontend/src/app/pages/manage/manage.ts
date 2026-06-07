import {
  Component,
  OnInit,
  inject,
  ChangeDetectionStrategy,
  signal,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MonitorService, StatusPageData, MonitoredServiceData } from '../../services/monitor.service';
import { AuthService } from '../../services/auth.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatListModule } from '@angular/material/list';
import { Router, RouterModule } from '@angular/router';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Sidebar } from '../../components/sidebar/sidebar';

@Component({
  selector: 'app-manage',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatInputModule,
    FormsModule,
    MatListModule,
    RouterModule,
    MatCheckboxModule,
    Sidebar
  ],
  templateUrl: './manage.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './manage.scss',
})
export class Manage implements OnInit {
  private monitorService = inject(MonitorService);
  public authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  statusPages = signal<StatusPageData[]>([]);
  selectedPage = signal<StatusPageData | null>(null);

  editTitle = '';
  editSlug = '';
  editDescription = '';
  editIsPublished = false;
  services = signal<MonitoredServiceData[]>([]);

  newPageTitle = '';
  newPageSlug = '';
  newServiceName = '';
  newServiceUrl = '';

  incidents = signal<any[]>([]);

  newIncidentTitle = '';
  newIncidentMessage = '';
  newIncidentStatus = 'Investigating';

  copied = signal(false);

  getWidgetCode(): string {
    const page = this.selectedPage();
    if (!page) return '';
    const origin = window.location.origin;
    return `<script src="${origin}/assets/widget.js" data-page-id="${page.id}"></script>`;
  }

  copyWidgetCode() {
    const code = this.getWidgetCode();
    if (code) {
      navigator.clipboard.writeText(code).then(() => {
        this.copied.set(true);
        setTimeout(() => {
          this.copied.set(true); // wait, should reset to false
          this.copied.set(false);
          this.cdr.markForCheck();
        }, 2000);
        this.cdr.markForCheck();
      });
    }
  }

  ngOnInit() {
    this.loadStatusPages();
  }

  loadStatusPages() {
    if (this.authService.isAuthenticated()) {
      this.monitorService.getStatusPages().subscribe({
        next: data => {
          // Filter to only their pages, excluding platform-status
          const myPages = data.filter(p => p.user_id === this.authService.currentUserId() && p.slug !== 'platform-status');
          this.statusPages.set(myPages);
          if (myPages.length > 0 && !this.selectedPage()) {
            this.selectPage(myPages[0]);
          }
          this.cdr.markForCheck();
        },
        error: err => console.error('Error fetching pages:', err),
      });
    }
  }

  createStatusPage() {
    if (this.newPageTitle && this.newPageSlug) {
      this.monitorService.createStatusPage({ title: this.newPageTitle, slug: this.newPageSlug }).subscribe({
        next: page => {
          this.loadStatusPages();
          this.newPageTitle = '';
          this.newPageSlug = '';
          this.selectPage(page);
        },
        error: err => console.error('Error creating page:', err)
      });
    }
  }

  deleteStatusPage(pageId: string) {
    if (confirm('Are you sure you want to delete this status page? All monitored services and incidents will be removed.')) {
      this.monitorService.deleteStatusPage(pageId).subscribe({
        next: () => {
          this.selectedPage.set(null);
          this.loadStatusPages();
        },
        error: err => console.error('Error deleting page:', err)
      });
    }
  }


  selectPage(page: StatusPageData | null) {
    this.selectedPage.set(page);
    if (page) {
      this.loadServices(page.id);
      this.loadIncidents(page.id);
      this.editTitle = page.title;
      this.editSlug = page.slug;
      this.editDescription = page.description || '';
      this.editIsPublished = page.is_published || false;
    }
  }

  updateStatusPage() {
    const page = this.selectedPage();
    if (page && this.editTitle && this.editSlug) {
      this.monitorService.updateStatusPage(page.id, {
        title: this.editTitle,
        slug: this.editSlug,
        description: this.editDescription,
        is_published: this.editIsPublished
      }).subscribe({
        next: updated => {
          this.selectedPage.set(updated);
          this.loadStatusPages();
          alert('Status page settings saved successfully.');
        },
        error: err => {
          console.error('Error updating status page:', err);
          alert('Failed to update status page. Slug may already be taken.');
        }
      });
    }
  }

  deleteAccount() {
    if (confirm('CRITICAL WARNING: Are you sure you want to permanently delete your account? All of your status pages, monitored services, incident reports, and telemetry data will be permanently and irreversibly destroyed.')) {
      const confirmText = prompt('Please type "DELETE MY ACCOUNT" to confirm:');
      if (confirmText === 'DELETE MY ACCOUNT') {
        this.authService.deleteAccount().then(success => {
          if (success) {
            alert('Your account and all associated data have been permanently deleted.');
            this.router.navigate(['/']);
          } else {
            alert('Failed to delete account.');
          }
        });
      }
    }
  }

  loadServices(pageId: string) {
    this.monitorService.getServices(pageId).subscribe({
      next: data => {
        this.services.set(data);
        this.cdr.markForCheck();
      },
      error: err => console.error('Error fetching services:', err)
    });
  }

  loadIncidents(pageId: string) {
    this.monitorService.getIncidents(pageId).subscribe({
      next: data => {
        this.incidents.set(data);
        this.cdr.markForCheck();
      },
      error: err => console.error('Error fetching incidents:', err)
    });
  }

  addService() {
    const page = this.selectedPage();
    if (page && this.newServiceName && this.newServiceUrl) {
      this.monitorService.addService(page.id, { name: this.newServiceName, url: this.newServiceUrl }).subscribe({
        next: () => {
          this.loadServices(page.id);
          this.newServiceName = '';
          this.newServiceUrl = '';
        },
        error: err => console.error('Error adding service:', err)
      });
    }
  }

  deleteService(serviceId: string) {
    this.monitorService.deleteService(serviceId).subscribe({
      next: () => {
        const page = this.selectedPage();
        if (page) this.loadServices(page.id);
      },
      error: err => console.error('Error deleting service:', err)
    });
  }

  addIncident() {
    const page = this.selectedPage();
    if (page && this.newIncidentTitle && this.newIncidentMessage && this.newIncidentStatus) {
      this.monitorService.createIncident(page.id, {
        title: this.newIncidentTitle,
        message: this.newIncidentMessage,
        status: this.newIncidentStatus
      }).subscribe({
        next: () => {
          this.loadIncidents(page.id);
          this.newIncidentTitle = '';
          this.newIncidentMessage = '';
          this.newIncidentStatus = 'Investigating';
        },
        error: err => console.error('Error adding incident:', err)
      });
    }
  }

  deleteIncident(incidentId: string) {
    this.monitorService.deleteIncident(incidentId).subscribe({
      next: () => {
        const page = this.selectedPage();
        if (page) this.loadIncidents(page.id);
      },
      error: err => console.error('Error deleting incident:', err)
    });
  }
}
