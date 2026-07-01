import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FluxAvatar } from '../avatar/avatar';
import { FluxTone } from '../core/types';

/**
 * flux-profile — user identity block (https://fluxui.dev/components/profile).
 * Project actions (e.g. flux-button) as content.
 */
@Component({
  selector: 'flux-profile',
  imports: [FluxAvatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <flux-avatar [src]="avatarSrc()" [name]="name()" [size]="45" [status]="status()" />
    <div class="flux-profile-identity">
      <span class="flux-profile-name">{{ name() }}</span>
      @if (detail()) {
        <span class="flux-profile-detail">{{ detail() }}</span>
      }
    </div>
    <div class="flux-profile-actions"><ng-content /></div>
  `,
  styles: [
    `
      :host {
        display: flex;
        align-items: center;
        gap: var(--flux-space-2);
        font-family: var(--flux-font-family);
      }
      .flux-profile-identity {
        display: flex;
        flex-direction: column;
        min-width: 0;
        flex: 1;
      }
      .flux-profile-name {
        font-size: var(--flux-font-size);
        font-weight: 600;
        color: var(--flux-text);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .flux-profile-detail {
        font-size: var(--flux-font-size);
        color: var(--flux-text-muted);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .flux-profile-actions {
        display: flex;
        align-items: center;
        gap: var(--flux-space-1);
      }
      .flux-profile-actions:empty {
        display: none;
      }
    `,
  ],
})
export class FluxProfile {
  readonly name = input.required<string>();
  readonly detail = input<string>('');
  readonly avatarSrc = input<string | null>(null);
  readonly status = input<FluxTone | null>(null);
}
