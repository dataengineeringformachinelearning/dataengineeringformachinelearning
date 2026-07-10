import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
  signal,
} from "@angular/core";
import { VikingControl, provideVikingCva } from "../core/cva";
import { VikingIcon } from "../icon/icon";

/**
 * viking-pillbox — multi-value tag input.
 * Type and press Enter (or comma) to add pills. ControlValueAccessor-compatible.
 */
@Component({
  selector: "viking-pillbox",
  imports: [VikingIcon],
  providers: [provideVikingCva(VikingPillbox)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="viking-control viking-pillbox"
      [class.viking-disabled]="disabled() || formDisabled()"
      role="group"
      [attr.aria-label]="label() || 'Tags'"
    >
      @for (pill of values(); track pill) {
        <span class="viking-pill">
          {{ pill }}
          <button
            type="button"
            class="viking-pill-remove"
            [attr.aria-label]="'Remove ' + pill"
            [disabled]="disabled() || formDisabled()"
            (click)="remove(pill)"
          >
            <viking-icon name="x" [size]="13" />
          </button>
        </span>
      }
      <input
        type="text"
        [placeholder]="values().length === 0 ? placeholder() : ''"
        [value]="draft()"
        [disabled]="disabled() || formDisabled()"
        [attr.aria-label]="label() || placeholder() || 'Add tag'"
        (input)="draft.set($any($event.target).value)"
        (keydown)="onKeydown($event)"
        (blur)="onTouched()"
      />
    </div>
  `,
  styles: [
    `
      .viking-pillbox {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: calc(var(--viking-space-1) / 1.5);
        min-height: var(--viking-control-height);
        padding: calc(var(--viking-space-1) / 1.5) var(--viking-space-1);
        background: var(--viking-surface);
        border: 1px solid var(--viking-border-strong);
        border-radius: var(--viking-radius);
        box-shadow: var(--viking-shadow-sm);
        transition: var(--viking-transition);
        cursor: text;
      }
      .viking-pillbox:focus-within {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
      }
      .viking-disabled {
        opacity: var(--viking-state-disabled-opacity);
      }
      .viking-pill {
        display: inline-flex;
        align-items: center;
        gap: var(--viking-space-0-5);
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size);
        font-weight: 500;
        color: var(--viking-text);
        background: var(--viking-accent-soft);
        border: 1px solid var(--viking-accent-strong);
        border-radius: var(--viking-radius-pill);
        padding: var(--viking-space-0-5) var(--viking-space-1);
        line-height: 1.35;
      }
      .viking-pill-remove {
        display: inline-flex;
        border: none;
        background: transparent;
        color: var(--viking-text-muted);
        cursor: pointer;
        padding: var(--viking-space-0-5);
        border-radius: var(--viking-radius-pill);
      }
      .viking-pill-remove:hover {
        color: var(--viking-danger);
      }
      .viking-pill-remove:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: 1px;
      }
      input {
        flex: 1;
        min-width: 108px;
        border: none;
        outline: none;
        background: transparent;
        color: var(--viking-text);
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size);
        padding: calc(var(--viking-space-1) / 2);
      }
      input::placeholder {
        color: var(--viking-text-muted);
      }
    `,
  ],
})
export class VikingPillbox extends VikingControl<string[]> {
  readonly values = model<string[]>([]);
  readonly placeholder = input<string>("Add a tag…");
  readonly label = input<string>("");
  readonly disabled = input<boolean>(false);

  protected readonly draft = signal("");

  writeValue(value: string[]): void {
    this.values.set(value ?? []);
  }

  protected onKeydown = (event: KeyboardEvent): void => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      const next = this.draft().trim().replace(/,$/, "");
      if (next && !this.values().includes(next)) {
        this.values.update((list) => [...list, next]);
        this.onChange(this.values());
      }
      this.draft.set("");
    } else if (
      event.key === "Backspace" &&
      !this.draft() &&
      this.values().length > 0
    ) {
      this.remove(this.values()[this.values().length - 1]);
    }
  };

  protected remove = (pill: string): void => {
    this.values.update((list) => list.filter((item) => item !== pill));
    this.onChange(this.values());
  };
}
