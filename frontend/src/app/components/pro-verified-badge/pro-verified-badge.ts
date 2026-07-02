import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FluxBadge } from '@deml/flux-material';

@Component({
  selector: 'app-pro-verified-badge',
  standalone: true,
  imports: [FluxBadge],
  template: `
    @if (show) {
      <flux-badge
        tone="accent"
        icon="check-circle"
        title="Pro subscriber — verified status page"
        aria-label="Pro verified status page"
      >
        Pro Verified
      </flux-badge>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProVerifiedBadge {
  @Input() show = false;
}
