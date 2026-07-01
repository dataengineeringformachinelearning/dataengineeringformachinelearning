import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { fluxUid } from '../core/uid';

/**
 * flux-field — label / description / error wrapper for any control
 * (https://fluxui.dev/components/field).
 * The projected control is associated with the label by wrapping.
 */
@Component({
  selector: 'flux-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.flux-field-invalid]': '!!error()' },
  template: `
    <!-- The projected control lives inside the label, which associates it implicitly. -->
    <!-- eslint-disable-next-line @angular-eslint/template/label-has-associated-control -->
    <label class="flux-field-label-wrap">
      @if (label()) {
        <span class="flux-field-label">
          {{ label() }}
          @if (required()) {
            <span class="flux-field-required" aria-hidden="true">*</span>
          }
        </span>
      }
      <ng-content />
    </label>
    @if (description() && !error()) {
      <p class="flux-field-description" [id]="descriptionId">{{ description() }}</p>
    }
    @if (error()) {
      <p class="flux-field-error" [id]="errorId" role="alert">{{ error() }}</p>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        font-family: var(--flux-font-family);
      }
      .flux-field-label-wrap {
        display: flex;
        flex-direction: column;
        gap: calc(var(--flux-space-1) / 1.5);
      }
      .flux-field-label {
        font-size: var(--flux-font-size);
        font-weight: 600;
        color: var(--flux-text);
      }
      .flux-field-required {
        color: var(--flux-danger);
      }
      .flux-field-description,
      .flux-field-error {
        margin: calc(var(--flux-space-1) / 1.5) 0 0;
        font-size: var(--flux-font-size);
        line-height: 1.45;
      }
      .flux-field-description {
        color: var(--flux-text-muted);
      }
      .flux-field-error {
        color: var(--flux-danger);
        font-weight: 500;
      }
      :host(.flux-field-invalid) ::ng-deep .flux-control {
        border-color: var(--flux-danger);
      }
    `,
  ],
})
export class FluxField {
  readonly label = input<string>('');
  readonly description = input<string>('');
  readonly error = input<string>('');
  readonly required = input<boolean>(false);

  protected readonly descriptionId = fluxUid('flux-field-description');
  protected readonly errorId = fluxUid('flux-field-error');
}
