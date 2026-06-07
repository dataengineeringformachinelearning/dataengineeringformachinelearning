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
    MatListModule
  ],
  templateUrl: './manage.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './manage.scss',
})
export class Manage implements OnInit {
  private monitorService = inject(MonitorService);
  public authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  statusPages = signal<StatusPageData[]>([]);
  selectedPage = signal<StatusPageData | null>(null);
  services = signal<MonitoredServiceData[]>([]);

  newPageTitle = '';
  newPageSlug = '';
  newServiceName = '';
  newServiceUrl = '';

  incidents = signal<any[]>([]);

  newIncidentTitle = '';
  newIncidentMessage = '';
  newIncidentStatus = 'Investigating';

  ngOnInit() {
    this.loadStatusPages();
  }

  loadStatusPages() {
    if (this.authService.isAuthenticated()) {
      this.monitorService.getStatusPages().subscribe({
        next: data => {
          // Filter to only their pages
          const myPages = data.filter(p => p.user_id === this.authService.currentUserId());
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

  selectPage(page: StatusPageData) {
    this.selectedPage.set(page);
    this.loadServices(page.id);
    this.loadIncidents(page.id);
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
