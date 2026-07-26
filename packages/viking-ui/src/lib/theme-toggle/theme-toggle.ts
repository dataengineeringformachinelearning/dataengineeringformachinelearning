import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  input,
  output,
} from "@angular/core";
import { VikingIcon } from "../icon/icon";
import {
  suiteThemeToggleAriaLabel,
  type SuiteThemePreference,
  type SuiteThemeResolved,
} from "../../core/theme";

/**
 * viking-theme-toggle — light/dark control (resolved theme + optional preference).
 * Chrome: suite-theme-toggle / .theme-toggle-btn
 */
@Component({
  selector: "viking-theme-toggle",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [VikingIcon],
  host: { class: "viking-theme-toggle-host suite-theme-toggle-host" },
  template: `
    <button
      type="button"
      class="suite-theme-toggle theme-toggle-btn fj-theme-toggle viking-theme-toggle"
      id="theme-toggle-btn"
      [attr.aria-label]="ariaLabel()"
      [attr.title]="ariaLabel()"
      [attr.data-theme]="theme()"
      [attr.data-preference]="preference()"
      (click)="toggle.emit()"
    >
      <viking-icon [name]="icon()" [size]="20" aria-hidden="true" />
    </button>
  `,
})
export class VikingThemeToggle {
  /** Resolved appearance currently on the document. */
  readonly theme = input<SuiteThemeResolved>("dark");
  /** Stored preference (system when following OS). */
  readonly preference = input<SuiteThemePreference>("system");
  readonly toggle = output<void>();

  protected readonly icon = computed(() =>
    this.theme() === "dark" ? "sun" : "moon",
  );

  protected readonly ariaLabel = computed(() =>
    suiteThemeToggleAriaLabel(this.preference(), this.theme()),
  );
}
