import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { VikingAvatar } from '../avatar/avatar';
import { VikingTone } from '../core/types';

/**
 * viking-profile — user identity block.
 * Project actions (e.g. viking-button) as content.
 */
@Component({
  selector: 'viking-profile',
  imports: [VikingAvatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <viking-avatar [src]="avatarSrc()" [name]="name()" [size]="45" [status]="status()" />
    <div class="viking-profile-identity">
      <span class="viking-profile-name">{{ name() }}</span>
      @if (detail()) {
        <span class="viking-profile-detail">{{ detail() }}</span>
      }
    </div>
    <div class="viking-profile-actions"><ng-content /></div>
  `,
  styles: [
    `
      :host {
        display: flex;
        align-items: center;
        gap: var(--viking-space-2);
        font-family: var(--viking-font-family);
      }
      .viking-profile-identity {
        display: flex;
        flex-direction: column;
        min-width: 0;
        flex: 1;
      }
      .viking-profile-name {
        font-size: var(--viking-font-size);
        font-weight: 600;
        color: var(--viking-text);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .viking-profile-detail {
        font-size: var(--viking-font-size);
        color: var(--viking-text-muted);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .viking-profile-actions {
        display: flex;
        align-items: center;
        gap: var(--viking-space-1);
      }
      .viking-profile-actions:empty {
        display: none;
      }
    `,
  ],
})
export class VikingProfile {
  readonly name = input.required<string>();
  readonly detail = input<string>('');
  readonly avatarSrc = input<string | null>(null);
  readonly status = input<VikingTone | null>(null);
}
