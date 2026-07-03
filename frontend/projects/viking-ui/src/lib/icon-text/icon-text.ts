import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { VikingIcon } from '../icon/icon';
import { VikingIconName } from '../core/icons';
import { VikingTone } from '../core/types';

/**
 * viking-icon-text — icon aligned beside a title and optional description.
 * Use for status rows (MFA enrolled, connected accounts, subscription state).
 */
@Component({
  selector: 'viking-icon-text',
  imports: [VikingIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'viking-icon-text',
    '[class.viking-icon-text--muted]': "tone() === 'muted'",
  },
  template: `
    <span class="viking-icon-text-icon" [class]="'viking-icon-text-icon--' + tone()">
      @if (icon()) {
        <viking-icon [name]="icon()!" [size]="iconSize()" />
      } @else {
        <ng-content select="[vikingIconTextIcon]" />
      }
    </span>
    <span class="viking-icon-text-body">
      <strong class="viking-icon-text-title">{{ title() }}</strong>
      @if (description()) {
        <span class="viking-icon-text-desc">{{ description() }}</span>
      } @else {
        <ng-content select="[vikingIconTextDesc]" />
      }
    </span>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        gap: var(--viking-space-1, 8px);
        min-width: 0;
        flex: 1;
        font-family: var(--viking-font-family);
      }

      .viking-icon-text-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        width: 28px;
        height: 28px;
        color: var(--viking-text-muted);
      }

      .viking-icon-text-icon--success {
        color: var(--viking-success);
      }

      .viking-icon-text-icon--info {
        color: var(--viking-info);
      }

      .viking-icon-text-icon--warning {
        color: var(--viking-warning);
      }

      .viking-icon-text-icon--danger {
        color: var(--viking-danger);
      }

      .viking-icon-text-icon--accent {
        color: var(--viking-accent-strong);
      }

      .viking-icon-text-body {
        display: flex;
        flex-direction: column;
        gap: var(--viking-space-half, 4px);
        min-width: 0;
      }

      .viking-icon-text-title {
        display: block;
        font-size: var(--viking-font-size, 16px);
        font-weight: var(--viking-font-weight-semibold, 600);
        color: var(--viking-text);
        line-height: var(--viking-line-height-tight, 1.25);
      }

      .viking-icon-text-desc {
        display: block;
        margin: 0;
        font-size: var(--viking-font-size, 16px);
        font-weight: var(--viking-font-weight-regular, 400);
        color: var(--viking-text-muted);
        line-height: var(--viking-line-height-relaxed, 1.625);
      }
    `,
  ],
})
export class VikingIconText {
  readonly icon = input<VikingIconName | null>(null);
  readonly title = input.required<string>();
  readonly description = input<string>('');
  readonly tone = input<VikingTone>('muted');
  readonly iconSize = input<number>(22);
}
