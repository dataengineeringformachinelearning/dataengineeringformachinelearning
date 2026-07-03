import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { fluxUid } from '../core/uid';

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
        <span class="viking-field-label">
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
      .viking-field-label-wrap {
        display: flex;
        flex-direction: column;
        gap: calc(var(--viking-space-1) / 1.5);
      }
      .viking-field-label {
        font-size: var(--viking-font-size);
        font-weight: 600;
        color: var(--viking-text);
      }
      .viking-field-required {
        color: var(--viking-danger);
      }
      .viking-field-description,
      .viking-field-error {
        margin: calc(var(--viking-space-1) / 1.5) 0 0;
        font-size: var(--viking-font-size);
        line-height: 1.45;
      }
      .viking-field-description {
        color: var(--viking-text-muted);
      }
      .viking-field-error {
        color: var(--viking-danger-text, var(--viking-danger));
        font-weight: 600;
      }
      :host(.viking-field-invalid) ::ng-deep .viking-control {
        border-color: var(--viking-danger);
      }
    `,
  ],
})
export class VikingField {
  readonly label = input<string>('');
  readonly description = input<string>('');
  readonly error = input<string>('');
  readonly required = input<boolean>(false);

  protected readonly descriptionId = fluxUid('viking-field-description');
  protected readonly errorId = fluxUid('viking-field-error');
}
