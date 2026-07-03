import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { VikingIcon } from '../icon/icon';
import { VikingIconName } from '../core/icons';
import { VikingTone } from '../core/types';

const TONE_ICONS: Record<string, VikingIconName> = {
  accent: 'info',
  secondary: 'info',
  success: 'check-circle',
  warning: 'alert-triangle',
  danger: 'alert-circle',
  info: 'info',
  muted: 'info',
};

/**
 * viking-callout — highlighted message block.
 */
@Component({
  selector: 'viking-callout',
  imports: [VikingIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'note',
    '[class]': "'viking-callout-' + tone()",
    '[style.display]': "dismissed() ? 'none' : null",
  },
  template: `
    <viking-icon class="viking-callout-icon" [name]="resolvedIcon()" [size]="22" />
    <div class="viking-callout-body">
      @if (heading()) {
        <p class="viking-callout-heading">{{ heading() }}</p>
      }
      <div class="viking-callout-text"><ng-content /></div>
    </div>
    @if (dismissible()) {
      <button type="button" class="viking-callout-close" aria-label="Dismiss" (click)="dismiss()">
        <viking-icon name="x" [size]="18" />
      </button>
    }
  `,
  styles: [
    `
      :host {
        display: flex;
        align-items: flex-start;
        gap: var(--viking-space-2);
        padding: var(--viking-space-2);
        border-radius: var(--viking-radius-lg);
        border: 1px solid var(--viking-border);
        border-left-width: 3px;
        background: var(--viking-surface-alt);
        color: var(--viking-text);
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size-sm);
        box-shadow: var(--viking-shadow-sm);
        animation: viking-fade-in var(--viking-duration) var(--viking-ease-default);
      }
      .viking-callout-icon {
        margin-top: 2px;
        color: var(--viking-text-muted);
      }
      :host(.viking-callout-accent) {
        border-color: var(--viking-accent);
        border-left-color: var(--viking-accent);
        background: var(--viking-accent-soft);
      }
      :host(.viking-callout-accent) .viking-callout-icon {
        color: var(--viking-accent);
      }
      :host(.viking-callout-secondary) {
        border-color: color-mix(in srgb, var(--viking-accent-secondary) 45%, transparent);
        border-left-color: var(--viking-accent-secondary);
        background: var(--viking-accent-secondary-soft);
      }
      :host(.viking-callout-secondary) .viking-callout-icon {
        color: var(--viking-accent-secondary);
      }
      :host(.viking-callout-info) {
        border-color: color-mix(in srgb, var(--viking-info) 45%, transparent);
        border-left-color: var(--viking-info);
        background: color-mix(in srgb, var(--viking-info) 10%, var(--viking-surface));
      }
      :host(.viking-callout-info) .viking-callout-icon {
        color: var(--viking-info);
      }
      :host(.viking-callout-success) {
        border-color: color-mix(in srgb, var(--viking-success) 45%, transparent);
        border-left-color: var(--viking-success);
        background: color-mix(in srgb, var(--viking-success) 10%, var(--viking-surface));
      }
      :host(.viking-callout-success) .viking-callout-icon {
        color: var(--viking-success);
      }
      :host(.viking-callout-warning) {
        border-color: color-mix(in srgb, var(--viking-warning) 45%, transparent);
        border-left-color: var(--viking-warning);
        background: color-mix(in srgb, var(--viking-warning) 12%, var(--viking-surface));
      }
      :host(.viking-callout-warning) .viking-callout-icon {
        color: var(--viking-warning);
      }
      :host(.viking-callout-danger) {
        border-color: color-mix(in srgb, var(--viking-danger) 45%, transparent);
        border-left-color: var(--viking-danger);
        background: color-mix(in srgb, var(--viking-danger) 10%, var(--viking-surface));
      }
      :host(.viking-callout-danger) .viking-callout-icon {
        color: var(--viking-danger);
      }
      .viking-callout-body {
        flex: 1;
        min-width: 0;
      }
      .viking-callout-heading {
        margin: 0 0 calc(var(--viking-space-1) / 2);
        font-size: var(--viking-font-size-ui);
        font-weight: 700;
      }
      .viking-callout-text {
        color: var(--viking-text);
        line-height: 1.55;
      }
      .viking-callout-close {
        border: none;
        background: transparent;
        color: var(--viking-text-muted);
        cursor: pointer;
        padding: var(--viking-space-half);
        border-radius: var(--viking-radius);
        display: inline-flex;
        transition: var(--viking-transition-interactive);
      }
      .viking-callout-close:hover {
        color: var(--viking-text);
        background: color-mix(in srgb, currentColor 8%, transparent);
      }
      .viking-callout-close:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: 1px;
      }
    `,
  ],
})
export class VikingCallout {
  readonly tone = input<VikingTone>('accent');
  readonly heading = input<string>('');
  readonly icon = input<VikingIconName | null>(null);
  readonly dismissible = input<boolean>(false);

  readonly closed = output<void>();

  protected readonly dismissed = signal(false);
  protected readonly resolvedIcon = computed<VikingIconName>(
    () => this.icon() ?? TONE_ICONS[this.tone()] ?? 'info',
  );

  protected dismiss = (): void => {
    this.dismissed.set(true);
    this.closed.emit();
  };
}
