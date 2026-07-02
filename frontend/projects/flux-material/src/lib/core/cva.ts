import { Directive, Provider, Type, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/** Registers a component as a ControlValueAccessor. */
export const provideFluxCva = (component: Type<unknown>): Provider => ({
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => component),
  multi: true,
});

/** Shared ControlValueAccessor plumbing for Flux-Material form controls. */
@Directive()
export abstract class FluxControl<T> implements ControlValueAccessor {
  protected onChange: (value: T) => void = () => {};
  protected onTouched: () => void = () => {};

  /** Disabled state driven by Angular forms (setDisabledState). */
  readonly formDisabled = signal(false);

  abstract writeValue(value: T): void;

  registerOnChange(fn: (value: T) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }
}
