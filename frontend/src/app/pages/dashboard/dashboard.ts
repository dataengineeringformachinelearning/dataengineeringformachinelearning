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
  selector: 'app-dashboard',
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
  templateUrl: './dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
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

  ngOnInit() {
    this.loadStatusPages();
  }

  loadStatusPages() {
    this.monitorService.getStatusPages().subscribe({
      next: data => {
        this.statusPages.set(data);
        if (data.length > 0 && !this.selectedPage()) {
          this.selectPage(data[0]);
        }
        this.cdr.markForCheck();
      },
      error: err => console.error('Error fetching pages:', err),
    });
  }

  canManage(page: StatusPageData | null): boolean {
    if (!page) return false;
    return this.authService.isAuthenticated() && page.user_id === this.authService.currentUserId();
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
}
