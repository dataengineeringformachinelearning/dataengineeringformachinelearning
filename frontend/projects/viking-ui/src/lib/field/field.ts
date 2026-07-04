import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { vikingUid } from '../core/uid';

/**
 * viking-field — label / description / error wrapper for any control
 *.
 * The projected control is associated with the label by wrapping.
 */
@Component({
  selector: 'viking-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.viking-field-invalid]': '!!error()' },
  template: `
    <!-- The projected control lives inside the label, which associates it implicitly. -->
    <!-- eslint-disable-next-line @angular-eslint/template/label-has-associated-control -->
    <label class="viking-field-label-wrap">
      @if (label()) {
        <span class="viking-field-label" [id]="labelId">
          {{ label() }}
          @if (required()) {
            <span class="viking-field-required" aria-hidden="true">*</span>
          }
        </span>
      }
      <ng-content />
    </label>
    @if (description() && !error()) {
      <p class="viking-field-description" [id]="descriptionId">{{ description() }}</p>
    }
    @if (error()) {
      <p class="viking-field-error" [id]="errorId" role="alert">{{ error() }}</p>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        font-family: var(--viking-font-family);
      }
      :host(.viking-field-invalid) {
        animation: viking-shake var(--viking-duration-slow) var(--viking-ease-default);
      }
      .viking-field-label-wrap {
        display: flex;
        flex-direction: column;
        gap: var(--viking-space-half);
      }
      .viking-field-label {
        font-size: var(--viking-font-size-sm);
        font-weight: var(--viking-font-weight-semibold);
        color: var(--viking-text);
        letter-spacing: var(--viking-letter-spacing-wide);
        line-height: var(--viking-line-height-tight);
      }
      .viking-field-required {
        color: var(--viking-danger);
        margin-left: 2px;
      }
      .viking-field-description,
      .viking-field-error {
        margin: var(--viking-space-half) 0 0;
        font-size: var(--viking-font-size-sm);
        line-height: var(--viking-line-height-normal);
      }
      .viking-field-description {
        color: var(--viking-text-muted);
      }
      .viking-field-error {
        color: var(--viking-danger-text, var(--viking-danger));
        font-weight: var(--viking-font-weight-semibold);
        display: flex;
        align-items: center;
        gap: var(--viking-space-half);
      }
      .viking-field-error::before {
        content: '';
        width: 6px;
        height: 6px;
        border-radius: var(--viking-radius-pill);
        background: var(--viking-danger);
        flex-shrink: 0;
      }
      :host(.viking-field-invalid) ::ng-deep .viking-control {
        border-color: var(--viking-danger);
        box-shadow: 0 0 0 1px color-mix(in srgb, var(--viking-danger) 25%, transparent);
      }
      :host ::ng-deep viking-select,
      :host ::ng-deep viking-native-select {
        display: block;
        width: 100%;
        min-width: 0;
      }
    `,
  ],
})
export class VikingField {
  readonly label = input<string>('');
  readonly description = input<string>('');
  readonly error = input<string>('');
  readonly required = input<boolean>(false);

  protected readonly descriptionId = vikingUid('viking-field-description');
  protected readonly errorId = vikingUid('viking-field-error');
  protected readonly labelId = vikingUid('viking-field-label');
}
