import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  input,
  output,
} from "@angular/core";
import { VikingIcon } from "../icon/icon";

/**
 * viking-theme-toggle — navbar utility control for light/dark theme switching.
 * Uses `.theme-toggle-btn` styles from viking-ui.css (static-navbar.scss).
 */
@Component({
  selector: "viking-theme-toggle",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [VikingIcon],
  host: { class: "viking-theme-toggle-host" },
  template: `
    <button
      type="button"
      class="theme-toggle-btn"
      id="theme-toggle-btn"
      aria-label="Toggle light and dark theme"
      (click)="toggle.emit()"
    >
      <viking-icon [name]="icon()" [size]="20" aria-hidden="true" />
    </button>
  `,
  styles: [
    `
      :host {
        display: contents;
      }

      .theme-toggle-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0;
        flex-shrink: 0;
        width: var(--viking-control-height, 40px);
        height: var(--viking-control-height, 40px);
        min-width: var(--viking-control-height, 40px);
        min-height: var(--viking-control-height, 40px);
        max-width: var(--viking-control-height, 40px);
        max-height: var(--viking-control-height, 40px);
        padding: 0;
        margin: 0;
        line-height: 0;
        box-sizing: border-box;
        border: 1px solid
          color-mix(
            in srgb,
            var(--viking-accent) 32%,
            var(--viking-border-strong, var(--viking-border))
          );
        border-radius: var(--viking-radius, 8px);
        background: color-mix(
          in srgb,
          var(--viking-accent) 8%,
          var(--viking-surface)
        );
        color: var(--viking-accent-strong, var(--viking-ring));
        box-shadow: var(--viking-shadow-sm);
        cursor: pointer;
        transition: var(--viking-transition-interactive);
        -webkit-tap-highlight-color: transparent;
      }

      .theme-toggle-btn:hover {
        border-color: var(--viking-accent-strong, var(--viking-ring));
        background: color-mix(
          in srgb,
          var(--viking-accent) 14%,
          var(--viking-surface-alt)
        );
        box-shadow: var(--viking-shadow-md);
      }

      .theme-toggle-btn:focus-visible {
        outline: var(--viking-ring-width, 2px) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset, 2px);
      }

      .theme-toggle-btn:active {
        transform: scale(var(--viking-state-active-scale, 0.98));
      }

      .theme-toggle-btn viking-icon,
      .theme-toggle-btn ::ng-deep svg {
        display: block;
        width: 20px;
        height: 20px;
        margin: 0;
      }
    `,
  ],
})
export class VikingThemeToggle {
  readonly theme = input<"light" | "dark">("dark");
  readonly toggle = output<void>();

  protected readonly icon = computed(() =>
    this.theme() === "dark" ? "sun" : "moon",
  );
}
