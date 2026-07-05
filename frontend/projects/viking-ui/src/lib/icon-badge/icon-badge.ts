import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { VikingIcon } from '../icon/icon';
import { VikingIconColorToken, VikingIconName, VikingIconSizePreset } from '../core/icons';

export type VikingIconBadgeTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

/**
 * viking-icon-badge — consistent icon backdrop for empty states, callouts, and metric headers.
 */
@Component({
  selector: 'viking-icon-badge',
  imports: [VikingIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'viking-icon-badge',
    '[class.viking-icon-badge-success]': "tone() === 'success'",
    '[class.viking-icon-badge-warning]': "tone() === 'warning'",
    '[class.viking-icon-badge-danger]': "tone() === 'danger'",
    '[class.viking-icon-badge-info]': "tone() === 'info'",
    '[attr.aria-hidden]': 'decorative() ? "true" : null',
  },
  template: `
    <viking-icon
      [name]="icon()"
      [size]="size()"
      [sizePreset]="sizePreset()"
      [color]="color()"
      [variant]="variant()"
    />
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        width: var(--viking-icon-badge-size, var(--viking-space-6));
        height: var(--viking-icon-badge-size, var(--viking-space-6));
        padding: var(--viking-icon-badge-padding, var(--viking-space-half));
        box-sizing: border-box;
        border-radius: var(--viking-radius-lg);
        background: var(--viking-accent-soft);
        color: var(--viking-accent-strong);
        box-shadow: var(--viking-shadow-sm);
      }

      :host(.viking-icon-badge-success) {
        background: color-mix(in srgb, var(--viking-success) 14%, transparent);
        color: var(--viking-success);
      }

      :host(.viking-icon-badge-warning) {
        background: color-mix(in srgb, var(--viking-warning) 14%, transparent);
        color: var(--viking-warning);
      }

      :host(.viking-icon-badge-danger) {
        background: color-mix(in srgb, var(--viking-danger) 14%, transparent);
        color: var(--viking-danger);
      }

      :host(.viking-icon-badge-info) {
        background: color-mix(in srgb, var(--viking-info) 14%, transparent);
        color: var(--viking-info);
      }
    `,
  ],
})
export class VikingIconBadge {
  readonly icon = input.required<VikingIconName>();
  readonly tone = input<VikingIconBadgeTone>('default');
  readonly size = input<number | undefined>(28);
  readonly sizePreset = input<VikingIconSizePreset | null>(null);
  readonly color = input<VikingIconColorToken | string | undefined>(undefined);
  readonly variant = input<'outline' | 'filled'>('outline');
  readonly decorative = input<boolean>(true);
}
