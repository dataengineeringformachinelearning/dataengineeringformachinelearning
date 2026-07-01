import {
  ChangeDetectionStrategy,
  Component,
  Injectable,
  inject,
  input,
  signal,
} from '@angular/core';
import { FluxIcon } from '../icon/icon';
import { FluxIconName } from '../core/icons';
import { FluxToastInstance, FluxToastOptions } from '../core/types';

const TONE_ICONS: Record<string, FluxIconName> = {
  accent: 'info',
  success: 'check-circle',
  warning: 'alert-triangle',
  danger: 'alert-circle',
  muted: 'info',
};

/**
 * FluxToastService — imperative toast API (https://fluxui.dev/components/toast).
 * Render a single <flux-toaster> outlet near the app root.
 */
@Injectable({ providedIn: 'root' })
export class FluxToastService {
  private nextId = 1;
  readonly toasts = signal<FluxToastInstance[]>([]);

  readonly show = (options: FluxToastOptions): number => {
    const toast: FluxToastInstance = {
      id: this.nextId++,
      heading: options.heading ?? '',
      text: options.text,
      tone: options.tone ?? 'accent',
      duration: options.duration ?? 4500,
    };
    this.toasts.update(list => [...list, toast]);
    if (toast.duration > 0) {
      setTimeout(() => this.dismiss(toast.id), toast.duration);
    }
    return toast.id;
  };

  readonly dismiss = (id: number): void => {
    this.toasts.update(list => list.filter(toast => toast.id !== id));
  };
}

/**
 * flux-toaster — fixed-position outlet that renders active toasts.
 */
@Component({
  selector: 'flux-toaster',
  imports: [FluxIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.flux-toaster-top]': "position() === 'top-end'" },
  template: `
    @for (toast of service.toasts(); track toast.id) {
      <div class="flux-toast" [class]="'flux-toast-' + toast.tone" role="status">
        <flux-icon class="flux-toast-icon" [name]="toneIcon(toast.tone)" [size]="20" />
        <div class="flux-toast-body">
          @if (toast.heading) {
            <p class="flux-toast-heading">{{ toast.heading }}</p>
          }
          <p class="flux-toast-text">{{ toast.text }}</p>
        </div>
        <button
          type="button"
          class="flux-toast-close"
          aria-label="Dismiss notification"
          (click)="service.dismiss(toast.id)"
        >
          <flux-icon name="x" [size]="16" />
        </button>
      </div>
    }
  `,
  styles: [
    `
      :host {
        position: fixed;
        bottom: var(--flux-space-3);
        right: var(--flux-space-3);
        display: flex;
        flex-direction: column;
        gap: var(--flux-space-1);
        z-index: var(--flux-z-toast);
        max-width: min(414px, calc(100vw - var(--flux-space-4)));
      }
      :host(.flux-toaster-top) {
        bottom: auto;
        top: var(--flux-space-3);
      }
      .flux-toast {
        display: flex;
        align-items: flex-start;
        gap: var(--flux-space-1);
        padding: var(--flux-space-2);
        background: var(--flux-surface);
        border: 1px solid var(--flux-border-strong);
        border-radius: var(--flux-radius);
        box-shadow: var(--flux-shadow-md);
        font-family: var(--flux-font-family);
        animation: flux-toast-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes flux-toast-in {
        from {
          transform: translateY(9px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      .flux-toast-icon {
        margin-top: 2px;
      }
      .flux-toast-accent .flux-toast-icon {
        color: var(--flux-accent);
      }
      .flux-toast-success .flux-toast-icon {
        color: var(--flux-success);
      }
      .flux-toast-warning .flux-toast-icon {
        color: var(--flux-warning);
      }
      .flux-toast-danger .flux-toast-icon {
        color: var(--flux-danger);
      }
      .flux-toast-body {
        flex: 1;
        min-width: 0;
      }
      .flux-toast-heading {
        margin: 0;
        font-size: var(--flux-font-size);
        font-weight: 600;
        color: var(--flux-text);
      }
      .flux-toast-text {
        margin: 0;
        font-size: var(--flux-font-size);
        color: var(--flux-text-muted);
        line-height: 1.45;
      }
      .flux-toast-close {
        display: inline-flex;
        border: none;
        background: transparent;
        color: var(--flux-text-muted);
        cursor: pointer;
        padding: 3px;
        border-radius: var(--flux-radius-pill);
      }
      .flux-toast-close:hover {
        color: var(--flux-text);
        background: var(--flux-accent-soft);
      }
      .flux-toast-close:focus-visible {
        outline: var(--flux-ring-width) solid var(--flux-ring);
        outline-offset: 1px;
      }
    `,
  ],
})
export class FluxToaster {
  protected readonly service = inject(FluxToastService);

  readonly position = input<'bottom-end' | 'top-end'>('bottom-end');

  protected toneIcon = (tone: string): FluxIconName => TONE_ICONS[tone] ?? 'info';
}
