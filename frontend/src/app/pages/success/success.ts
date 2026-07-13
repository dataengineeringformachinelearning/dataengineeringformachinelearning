import {
  Component,
  OnInit,
  inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  VikingButton,
  VikingCard,
  VikingHeading,
} from '@dataengineeringformachinelearning/viking-ui';
import { VikingAppIcon } from '../../components/viking-app-icon/viking-app-icon';

@Component({
  selector: 'app-success',
  standalone: true,
  imports: [VikingButton, VikingCard, VikingHeading, VikingAppIcon],
  templateUrl: './success.html',
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
    this.http.post(`${environment.backendUrl}/api/v1/billing/sync`, {}).subscribe({
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
