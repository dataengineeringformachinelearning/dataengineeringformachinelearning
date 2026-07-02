import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { FluxTone } from '../core/types';

/**
 * flux-avatar — image or initials avatar with optional status indicator
 * (https://fluxui.dev/components/avatar).
 */
@Component({
  selector: 'flux-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
    '[class.flux-avatar-square]': 'square()',
  },
  template: `
    @if (src() && !imageFailed()) {
      <img [src]="src()" [alt]="name()" (error)="imageFailed.set(true)" />
    } @else {
      <span class="flux-avatar-initials" [style.font-size.px]="size() * 0.4">
        {{ initials() }}
      </span>
    }
    @if (status()) {
      <span class="flux-avatar-status" [class]="'flux-status-' + status()" role="status">
        <span class="flux-visually-hidden">{{ status() }}</span>
      </span>
    }
  `,
  styles: [
    `
      :host {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--flux-radius-pill);
        background: var(--flux-surface-alt);
        border: 1px solid var(--flux-border);
        overflow: visible;
        flex-shrink: 0;
      }
      :host(.flux-avatar-square) {
        border-radius: var(--flux-radius);
      }
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: inherit;
      }
      .flux-avatar-initials {
        font-family: var(--flux-font-family);
        font-weight: 600;
        color: var(--flux-text);
        text-transform: uppercase;
        letter-spacing: 0.02em;
        user-select: none;
      }
      .flux-avatar-status {
        position: absolute;
        right: -1px;
        bottom: -1px;
        width: 27%;
        height: 27%;
        min-width: 9px;
        min-height: 9px;
        border-radius: var(--flux-radius-pill);
        border: 2px solid var(--flux-surface);
      }
      .flux-status-success {
        background: var(--flux-success);
      }
      .flux-status-warning {
        background: var(--flux-warning);
      }
      .flux-status-danger {
        background: var(--flux-danger);
      }
      .flux-status-accent {
        background: var(--flux-accent);
      }
      .flux-status-muted {
        background: var(--flux-text-muted);
      }
      .flux-visually-hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
        white-space: nowrap;
      }
    `,
  ],
})
export class FluxAvatar {
  readonly src = input<string | null>(null);
  readonly name = input<string>('');
  readonly size = input<number>(45);
  readonly square = input<boolean>(false);
  readonly status = input<FluxTone | null>(null);

  protected readonly imageFailed = signal(false);

  protected readonly initials = computed(() => {
    const parts = this.name().trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return '?';
    }
    const first = parts[0].charAt(0);
    const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
    return `${first}${last}`;
  });
}
