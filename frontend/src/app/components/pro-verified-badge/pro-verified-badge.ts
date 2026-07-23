import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { VikingBadge } from '@dataengineeringformachinelearning/viking-ui';

@Component({
  selector: 'app-pro-verified-badge',
  standalone: true,
  imports: [VikingBadge],
  template: `
    @if (show()) {
      <viking-badge
        tone="accent"
        title="Pro subscriber — verified status page"
        aria-label="Pro verified status page"
      >
        Pro Verified
      </viking-badge>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProVerifiedBadge {
  readonly show = input(false);
}
