import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  input,
  model,
  output,
} from "@angular/core";
import { VikingControl, provideVikingCva } from "../core/cva";
import { VikingIcon } from "../icon/icon";
import { VikingIconName } from "../../core/icons";
import { VikingSpinner } from "../spinner/spinner";
import { registerVikingInputWcElement } from "../../web/input/viking-input-wc";
import type { VikingInputWc } from "../../web/input/viking-input-wc";

registerVikingInputWcElement();

/**
 * viking-input — thin Angular wrapper around `viking-input-wc`.
 * ControlValueAccessor-compatible.
 */
@Component({
  selector: "viking-input",
  imports: [VikingIcon, VikingSpinner],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [provideVikingCva(VikingInput)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <viking-input-wc
      [attr.type]="type()"
      [attr.name]="name() || null"
      [attr.placeholder]="placeholder()"
      [attr.value]="value()"
      [attr.disabled]="isDisabled() ? '' : null"
      [attr.loading]="loading() ? '' : null"
      [attr.clearable]="clearable() ? '' : null"
      [attr.autocomplete]="autocomplete() || null"
      [attr.aria-label]="label() || placeholder() || 'Text input'"
      (input)="onWcInput($event)"
      (blur)="onTouched()"
      (viking-cleared)="clear()"
    >
      @if (icon()) {
        <viking-icon
          slot="leading"
          class="viking-input-icon"
          [name]="icon()!"
          [size]="20"
        />
      }
      @if (loading()) {
        <viking-spinner slot="trailing" [size]="16" label="Loading input" />
      } @else if (iconTrailing()) {
        <viking-icon
          slot="trailing"
          class="viking-input-icon"
          [name]="iconTrailing()!"
          [size]="20"
        />
      }
      @if (kbd()) {
        <kbd slot="trailing" class="viking-input-kbd">{{ kbd() }}</kbd>
      }
    </viking-input-wc>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .viking-input-icon {
        color: var(--viking-text-muted);
      }
      .viking-input-kbd {
        font-family: var(--viking-font-family-mono);
        font-size: var(--viking-font-size-xs);
        color: var(--viking-text-muted);
        background: var(--viking-surface-alt);
        border: 1px solid var(--viking-border);
        border-radius: var(--viking-radius-xs);
        padding: 0 var(--viking-space-0-5);
        line-height: 1.4;
      }
    `,
  ],
})
export class VikingInput extends VikingControl<string> {
  readonly value = model<string>("");
  readonly type = input<string>("text");
  /** Native input name — required for password managers and form autofill. */
  readonly name = input<string>("");
  readonly placeholder = input<string>("");
  readonly label = input<string>("");
  readonly icon = input<VikingIconName | null>(null);
  readonly iconTrailing = input<VikingIconName | null>(null);
  readonly kbd = input<string | null>(null);
  readonly clearable = input<boolean>(false);
  readonly loading = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly autocomplete = input<string>("");

  readonly cleared = output<void>();

  protected isDisabled = (): boolean => this.disabled() || this.formDisabled();

  writeValue(value: string): void {
    this.value.set(value ?? "");
  }

  protected onWcInput = (event: Event): void => {
    const wc = event.currentTarget as VikingInputWc | null;
    const next = wc?.value ?? this.value();
    this.value.set(next);
    this.onChange(next);
  };

  protected clear = (): void => {
    this.value.set("");
    this.onChange("");
    this.cleared.emit();
  };
}
