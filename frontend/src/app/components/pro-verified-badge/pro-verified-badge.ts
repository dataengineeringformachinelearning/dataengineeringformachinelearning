import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-pro-verified-badge',
  standalone: true,
  imports: [MatIconModule],
  template: `
    @if (show) {
      <span
        class="status-badge-premium pro-verified"
        title="Pro subscriber — verified status page"
        aria-label="Pro verified status page"
      >
        <mat-icon aria-hidden="true">verified</mat-icon>
        <span>Pro Verified</span>
      </span>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProVerifiedBadge {
  @Input() show = false;
}
