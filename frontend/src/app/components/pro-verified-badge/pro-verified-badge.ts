import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FluxAppIcon } from '../flux-app-icon/flux-app-icon';

@Component({
  selector: 'app-pro-verified-badge',
  standalone: true,
  imports: [FluxAppIcon],
  template: `
    @if (show) {
      <span
        class="status-badge-premium pro-verified"
        title="Pro subscriber — verified status page"
        aria-label="Pro verified status page"
      >
        <flux-app-icon name="verified" [ariaHidden]="true" />
        <span>Pro Verified</span>
      </span>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProVerifiedBadge {
  @Input() show = false;
}
