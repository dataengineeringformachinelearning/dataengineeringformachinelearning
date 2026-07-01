import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FluxIcon } from '../icon/icon';
import { FluxIconName } from '../core/icons';
import { FluxTone } from '../core/types';

const TONE_ICONS: Record<string, FluxIconName> = {
  accent: 'info',
  success: 'check-circle',
  warning: 'alert-triangle',
  danger: 'alert-circle',
  muted: 'info',
};

/**
 * flux-callout — highlighted message block (https://fluxui.dev/components/callout).
 */
@Component({
  selector: 'flux-callout',
  imports: [FluxIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'note',
    '[class]': "'flux-callout-' + tone()",
    '[style.display]': "dismissed() ? 'none' : null",
  },
  template: `
    <flux-icon class="flux-callout-icon" [name]="resolvedIcon()" [size]="22" />
    <div class="flux-callout-body">
      @if (heading()) {
        <p class="flux-callout-heading">{{ heading() }}</p>
      }
      <div class="flux-callout-text"><ng-content /></div>
    </div>
    @if (dismissible()) {
      <button type="button" class="flux-callout-close" aria-label="Dismiss" (click)="dismiss()">
        <flux-icon name="x" [size]="18" />
      </button>
    }
  `,
  styles: [
    `
      :host {
        display: flex;
        align-items: flex-start;
        gap: var(--flux-space-2);
        padding: var(--flux-space-2);
        border-radius: var(--flux-radius);
        border: 1px solid var(--flux-border);
        background: var(--flux-surface-alt);
        color: var(--flux-text);
        font-family: var(--flux-font-family);
        font-size: var(--flux-font-size);
      }
      .flux-callout-icon {
        margin-top: 2px;
        color: var(--flux-text-muted);
      }
      :host(.flux-callout-accent) {
        border-color: var(--flux-accent);
        background: var(--flux-accent-soft);
      }
      :host(.flux-callout-accent) .flux-callout-icon {
        color: var(--flux-accent);
      }
      :host(.flux-callout-success) {
        border-color: var(--flux-success);
        background: color-mix(in srgb, var(--flux-success) 10%, transparent);
      }
      :host(.flux-callout-success) .flux-callout-icon {
        color: var(--flux-success);
      }
      :host(.flux-callout-warning) {
        border-color: var(--flux-warning);
        background: color-mix(in srgb, var(--flux-warning) 14%, transparent);
      }
      :host(.flux-callout-danger) {
        border-color: var(--flux-danger);
        background: color-mix(in srgb, var(--flux-danger) 10%, transparent);
      }
      .flux-callout-body {
        flex: 1;
        min-width: 0;
      }
      .flux-callout-heading {
        margin: 0 0 calc(var(--flux-space-1) / 2);
        font-weight: 600;
      }
      .flux-callout-text {
        color: var(--flux-text-muted);
        line-height: 1.55;
      }
      .flux-callout-close {
        border: none;
        background: transparent;
        color: var(--flux-text-muted);
        cursor: pointer;
        padding: 4px;
        border-radius: var(--flux-radius);
        display: inline-flex;
      }
      .flux-callout-close:hover {
        color: var(--flux-text);
        background: var(--flux-accent-soft);
      }
      .flux-callout-close:focus-visible {
        outline: var(--flux-ring-width) solid var(--flux-ring);
        outline-offset: 1px;
      }
    `,
  ],
})
export class FluxCallout {
  readonly tone = input<FluxTone>('accent');
  readonly heading = input<string>('');
  readonly icon = input<FluxIconName | null>(null);
  readonly dismissible = input<boolean>(false);

  readonly closed = output<void>();

  protected readonly dismissed = signal(false);
  protected readonly resolvedIcon = computed<FluxIconName>(
    () => this.icon() ?? TONE_ICONS[this.tone()] ?? 'info',
  );

  protected dismiss = (): void => {
    this.dismissed.set(true);
    this.closed.emit();
  };
}
