import {
  ChangeDetectionStrategy,
  Component,
  Injectable,
  inject,
  input,
  signal,
} from '@angular/core';
import { VikingIcon } from '../icon/icon';
import { VikingIconName } from '../core/icons';
import { VikingToastInstance, VikingToastOptions } from '../core/types';

const TONE_ICONS: Record<string, VikingIconName> = {
  accent: 'info',
  success: 'check-circle',
  warning: 'alert-triangle',
  danger: 'alert-circle',
  muted: 'info',
};

/**
 * VikingToastService — imperative toast API.
 * Render a single <viking-toaster> outlet near the app root.
 */
@Injectable({ providedIn: 'root' })
export class VikingToastService {
  private nextId = 1;
  readonly toasts = signal<VikingToastInstance[]>([]);

  readonly show = (options: VikingToastOptions): number => {
    const toast: VikingToastInstance = {
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
 * viking-toaster — fixed-position outlet that renders active toasts.
 */
@Component({
  selector: 'viking-toaster',
  imports: [VikingIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.viking-toaster-top]': "position() === 'top-end'" },
  template: `
    @for (toast of service.toasts(); track toast.id) {
      <div class="viking-toast" [class]="'viking-toast-' + toast.tone" role="status">
        <viking-icon class="viking-toast-icon" [name]="toneIcon(toast.tone)" [size]="20" />
        <div class="viking-toast-body">
          @if (toast.heading) {
            <p class="viking-toast-heading">{{ toast.heading }}</p>
          }
          <p class="viking-toast-text">{{ toast.text }}</p>
        </div>
        <button
          type="button"
          class="viking-toast-close"
          aria-label="Dismiss notification"
          (click)="service.dismiss(toast.id)"
        >
          <viking-icon name="x" [size]="16" />
        </button>
      </div>
    }
  `,
  styles: [
    `
      :host {
        position: fixed;
        bottom: var(--viking-space-3);
        right: var(--viking-space-3);
        display: flex;
        flex-direction: column;
        gap: var(--viking-space-1);
        z-index: var(--viking-z-toast);
        max-width: min(414px, calc(100vw - var(--viking-space-4)));
      }
      @media (max-width: 767px) {
        :host {
          bottom: var(--viking-space-2);
          right: var(--viking-space-2);
          left: var(--viking-space-2);
          max-width: none;
        }
      }
      :host(.viking-toaster-top) {
        bottom: auto;
        top: var(--viking-space-3);
      }
      .viking-toast {
        display: flex;
        align-items: flex-start;
        gap: var(--viking-space-1);
        padding: var(--viking-space-2);
        background: var(--viking-surface);
        border: 1px solid var(--viking-border-strong);
        border-radius: var(--viking-radius);
        box-shadow: var(--viking-shadow-md);
        font-family: var(--viking-font-family);
        animation: viking-toast-in var(--viking-duration) var(--viking-ease-out);
      }
      @keyframes viking-toast-in {
        from {
          transform: translateY(var(--viking-space-1));
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .viking-toast {
          animation: none;
        }
      }
      .viking-toast-icon {
        margin-top: 2px;
      }
      .viking-toast-accent .viking-toast-icon {
        color: var(--viking-accent);
      }
      .viking-toast-success .viking-toast-icon {
        color: var(--viking-success);
      }
      .viking-toast-warning .viking-toast-icon {
        color: var(--viking-warning);
      }
      .viking-toast-danger .viking-toast-icon {
        color: var(--viking-danger);
      }
      .viking-toast-body {
        flex: 1;
        min-width: 0;
      }
      .viking-toast-heading {
        margin: 0;
        font-size: var(--viking-font-size);
        font-weight: 600;
        color: var(--viking-text);
      }
      .viking-toast-text {
        margin: 0;
        font-size: var(--viking-font-size);
        color: var(--viking-text-muted);
        line-height: 1.45;
      }
      .viking-toast-close {
        display: inline-flex;
        border: none;
        background: transparent;
        color: var(--viking-text-muted);
        cursor: pointer;
        padding: var(--viking-space-half);
        border-radius: var(--viking-radius-pill);
        transition: var(--viking-transition-interactive);
      }
      .viking-toast-close:hover {
        color: var(--viking-text);
        background: var(--viking-accent-soft);
      }
      .viking-toast-close:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: 1px;
      }
    `,
  ],
})
export class VikingToaster {
  protected readonly service = inject(VikingToastService);

  readonly position = input<'bottom-end' | 'top-end'>('bottom-end');

  protected toneIcon = (tone: string): VikingIconName => TONE_ICONS[tone] ?? 'info';
}
