import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * viking-label — accessible form label.
 */
@Component({
  selector: 'viking-label',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="viking-label" [attr.for]="htmlFor() || null">
      <ng-content />
      @if (required()) {
        <span class="viking-label-required" aria-hidden="true">*</span>
      }
    </label>
  `,
  styles: [
    `
      .viking-label {
        display: inline-flex;
        align-items: center;
        gap: calc(var(--viking-space-1) / 4);
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size-ui);
        font-weight: 600;
        color: var(--viking-text);
        letter-spacing: 0.01em;
        line-height: 1.3;
      }
      .viking-label-required {
        color: var(--viking-accent);
      }
    `,
  ],
})
export class VikingLabel {
  readonly htmlFor = input<string>('');
  readonly required = input<boolean>(false);
}
