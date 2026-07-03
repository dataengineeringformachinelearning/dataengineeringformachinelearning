import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { VikingControl, provideVikingCva } from '../core/cva';
import { VikingSelectOption } from '../core/types';
import { fluxUid } from '../core/uid';

/**
 * viking-native-select — styled native &lt;select&gt;.
 */
@Component({
  selector: 'viking-native-select',
  providers: [provideVikingCva(VikingNativeSelect)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="viking-native-select" [class.viking-disabled]="disabled() || formDisabled()">
      @if (label()) {
        <span class="viking-native-select-label">{{ label() }}</span>
      }
      <select
        class="viking-native-select-control"
        [id]="selectId"
        [disabled]="disabled() || formDisabled()"
        [value]="value() ?? ''"
        (change)="onSelectChange($event)"
        (blur)="onTouched()"
      >
        @if (placeholder()) {
          <option value="" disabled [selected]="!value()">{{ placeholder() }}</option>
        }
        @for (option of options(); track option.label) {
          <option [value]="option.value" [disabled]="option.disabled">
            {{ option.label }}
          </option>
        }
      </select>
    </label>
  `,
  styles: [
    `
      :host {
        display: block;
        font-family: var(--viking-font-family);
      }
      .viking-native-select {
        display: flex;
        flex-direction: column;
        gap: var(--viking-space-1);
      }
      .viking-native-select-label {
        font-size: var(--viking-font-size-ui);
        font-weight: 700;
        color: var(--viking-text);
      }
      .viking-native-select-control {
        width: 100%;
        min-height: var(--viking-control-height);
        padding: 0 var(--viking-space-2);
        font-size: var(--viking-font-size);
        color: var(--viking-text);
        background: var(--viking-surface);
        border: 1px solid var(--viking-border-strong);
        border-radius: var(--viking-radius);
        cursor: pointer;
        transition: var(--viking-transition);
      }
      .viking-native-select-control:hover:not(:disabled) {
        border-color: var(--viking-accent-strong);
      }
      .viking-native-select-control:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
      }
      .viking-disabled .viking-native-select-control {
        opacity: var(--viking-state-disabled-opacity);
        cursor: not-allowed;
      }
    `,
  ],
})
export class VikingNativeSelect extends VikingControl<string | number | null> {
  readonly label = input('');
  readonly placeholder = input('');
  readonly options = input<VikingSelectOption[]>([]);
  readonly disabled = input(false);

  readonly value = model<string | number | null>(null);

  protected readonly selectId = fluxUid('viking-native-select');

  writeValue(value: string | number | null): void {
    this.value.set(value);
  }

  protected onSelectChange = (event: Event): void => {
    const raw = (event.target as HTMLSelectElement).value;
    const match = this.options().find(o => String(o.value) === raw);
    const next = (match?.value ?? raw) as string | number;
    this.value.set(next);
    this.onChange(next);
  };
}
