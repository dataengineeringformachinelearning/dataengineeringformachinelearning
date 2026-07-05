import {
  ChangeDetectionStrategy,
  Component,
  Optional,
  input,
  model,
  output,
} from "@angular/core";
import { VIKING_TOGGLE_GROUP, VikingToggleGroup } from "./toggle-group";

/**
 * viking-toggle — pressed-state button toggle.
 */
@Component({
  selector: "viking-toggle",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="viking-toggle"
      [class.viking-pressed]="isPressed()"
      [attr.aria-pressed]="isPressed()"
      [disabled]="disabled()"
      [attr.aria-label]="label() || null"
      (click)="toggle()"
    >
      <ng-content />
    </button>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }
      .viking-toggle {
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size-ui);
        font-weight: 700;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--viking-space-1);
        min-height: var(--viking-control-height-sm);
        min-width: var(--viking-btn-min-width, 120px);
        padding: 0 var(--viking-space-2);
        border: 1px solid var(--viking-border-strong);
        border-radius: var(--viking-radius);
        background: var(--viking-surface);
        color: var(--viking-text);
        cursor: pointer;
        transition: var(--viking-transition);
      }
      .viking-toggle:hover:not(:disabled) {
        border-color: var(--viking-accent-strong);
        background: var(--viking-accent-soft);
      }
      .viking-toggle:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
      }
      .viking-toggle.viking-pressed {
        background: var(--viking-accent);
        border-color: var(--viking-accent);
        color: var(--viking-accent-content);
      }
      .viking-toggle:disabled {
        opacity: var(--viking-state-disabled-opacity);
        cursor: not-allowed;
      }
    `,
  ],
})
export class VikingToggle {
  constructor(@Optional() private readonly group: VikingToggleGroup | null) {}

  readonly pressed = model(false);
  readonly value = input<string>("");
  readonly disabled = input(false);
  readonly label = input("");

  readonly toggled = output<boolean>();

  protected isPressed = (): boolean => {
    if (this.group && this.value()) {
      return this.group.value() === this.value();
    }
    return this.pressed();
  };

  protected toggle = (): void => {
    if (this.disabled()) return;
    if (this.group && this.value()) {
      this.group.value.set(this.value());
      this.toggled.emit(true);
      return;
    }
    const next = !this.pressed();
    this.pressed.set(next);
    this.toggled.emit(next);
  };
}
