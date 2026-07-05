import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { VikingIcon } from '../icon/icon';
import { VikingIconName } from '../../../../../packages/viking-ui/src/core/icons';

export type VikingFormSectionLayout = 'inline' | 'stack' | 'status';

/**
 * viking-form-panel — groups related form sections inside a card without nested outlines.
 */
@Component({
  selector: 'viking-form-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'viking-form-panel' },
  template: `<ng-content />`,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        gap: 0;
        width: 100%;
        min-width: 0;
      }
      :host ::ng-deep viking-form-section + viking-form-section {
        border-top: 1px solid var(--viking-border-subtle);
        margin-top: var(--viking-space-3);
        padding-top: var(--viking-space-3);
      }
    `,
  ],
})
export class VikingFormPanel {}

/**
 * viking-form-section — standard dashboard form row: heading, fields, and actions.
 * Use inside viking-form-panel (or a card body) to avoid nested bordered sub-forms.
 */
@Component({
  selector: 'viking-form-section',
  imports: [VikingIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'viking-form-section',
    '[class.viking-form-section-inline]': "layout() === 'inline'",
    '[class.viking-form-section-stack]': "layout() === 'stack'",
    '[class.viking-form-section-status]': "layout() === 'status'",
  },
  template: `
    <header class="viking-form-section-header">
      @if (icon()) {
        <viking-icon [name]="icon()!" [size]="16" class="viking-form-section-icon" />
      }
      <h3 class="viking-form-section-title">{{ heading() }}</h3>
    </header>

    <div class="viking-form-section-body">
      <div class="viking-form-section-fields">
        <ng-content />
      </div>
      <div class="viking-form-section-actions">
        <ng-content select="[vikingFormActions]" />
      </div>
    </div>

    <div class="viking-form-section-footer">
      <ng-content select="[vikingFormFooter]" />
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--viking-space-2);
        width: 100%;
        min-width: 0;
        font-family: var(--viking-font-family);
      }

      .viking-form-section-header {
        display: flex;
        align-items: center;
        gap: var(--viking-space-1);
        min-width: 0;
      }

      .viking-form-section-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border-radius: var(--viking-radius-sm);
        background: var(--viking-accent-soft);
        color: var(--viking-accent-strong);
        flex-shrink: 0;
      }

      .viking-form-section-title {
        margin: 0;
        font-size: var(--viking-font-size-ui);
        font-weight: var(--viking-font-weight-semibold);
        letter-spacing: var(--viking-letter-spacing-caps);
        text-transform: uppercase;
        color: var(--viking-text);
        line-height: var(--viking-line-height-tight);
      }

      .viking-form-section-body {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: var(--viking-space-2);
        width: 100%;
        min-width: 0;
      }

      .viking-form-section-fields {
        display: flex;
        flex-direction: column;
        gap: var(--viking-space-2);
        min-width: 0;
        flex: 1;
      }

      .viking-form-section-actions {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: var(--viking-space-1);
        flex-shrink: 0;
      }

      .viking-form-section-actions:empty {
        display: none;
      }

      .viking-form-section-footer:empty {
        display: none;
      }

      .viking-form-section-footer:not(:empty) {
        display: flex;
        flex-direction: column;
        gap: var(--viking-space-1);
      }

      :host(.viking-form-section-inline) .viking-form-section-body {
        @media (min-width: 601px) {
          flex-direction: row;
          align-items: flex-end;
        }
      }

      :host(.viking-form-section-inline) .viking-form-section-actions {
        @media (min-width: 601px) {
          align-items: center;
          justify-content: flex-end;
          width: auto;
        }
      }

      :host(.viking-form-section-status) .viking-form-section-body {
        @media (min-width: 601px) {
          flex-direction: row;
          align-items: flex-start;
          justify-content: space-between;
        }
      }

      :host(.viking-form-section-status) .viking-form-section-fields {
        flex-direction: row;
        align-items: flex-start;
        gap: var(--viking-space-1, 8px);
      }

      :host(.viking-form-section-status) .viking-form-section-actions {
        @media (min-width: 601px) {
          align-items: flex-start;
          padding-top: 1px;
          margin-left: auto;
        }
      }

      :host ::ng-deep viking-field {
        width: 100%;
        min-width: 0;
      }
    `,
  ],
})
export class VikingFormSection {
  readonly heading = input.required<string>();
  readonly icon = input<VikingIconName | null>(null);
  readonly layout = input<VikingFormSectionLayout>('inline');
}
