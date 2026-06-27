import {
  Component,
  OnInit,
  inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-success',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './success.html',
  styleUrl: './success.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Success implements OnInit {
  private titleService = inject(Title);
  private metaService = inject(Meta);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  isSyncing = true;
  syncSuccess = false;

  ngOnInit() {
    this.titleService.setTitle('Subscription Successful - DEML APP');
    this.metaService.updateTag({
      name: 'description',
      content: 'Your subscription was successful.',
    });

    this.syncSubscription();
  }

  private syncSubscription() {
    this.http.post(`${environment.backendUrl}/api/billing/sync`, {}).subscribe({
      next: (res: any) => {
        this.isSyncing = false;
        this.syncSuccess = res.active;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isSyncing = false;
        this.syncSuccess = false;
        this.cdr.markForCheck();
      },
    });
  }
}
