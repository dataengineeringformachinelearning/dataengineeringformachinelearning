import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from "@angular/core";
import type { SuiteThemePreference } from "../../core/theme";
import { VikingActivityList } from "../activity-list/activity-list";
import { VikingButton } from "../button/button";
import { VikingCallout } from "../callout/callout";
import { VikingCheckbox } from "../checkbox/checkbox";
import { VikingKbd } from "../kbd/kbd";
import { VikingPreferencesService } from "./preferences.service";

/**
 * Preferences form body — theme, export/import, activity
 * (FORJD ADR-0024 / ADR-0026 / ADR-0027).
 */
@Component({
  selector: "viking-preferences-panel",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    VikingActivityList,
    VikingButton,
    VikingCallout,
    VikingCheckbox,
    VikingKbd,
  ],
  template: `
    <div class="suite-preferences viking-preferences fj-preferences">
      <p
        class="suite-preferences-lede viking-preferences-lede fj-preferences-lede"
      >
        Appearance syncs across browser tabs on this device. Nothing here is
        uploaded — secrets and API tokens stay out of preferences.
      </p>

      <section
        class="suite-preferences-section viking-preferences-section fj-preferences-section"
        aria-labelledby="viking-prefs-theme"
      >
        <h3
          id="viking-prefs-theme"
          class="suite-preferences-heading viking-preferences-heading fj-preferences-heading"
        >
          Theme
        </h3>
        <div
          class="suite-preferences-theme viking-preferences-theme fj-preferences-theme"
          role="group"
          aria-label="Theme preference"
        >
          @for (opt of themeOptions; track opt.value) {
            <viking-button
              type="button"
              [variant]="
                prefs.snapshot().theme === opt.value ? 'primary' : 'outline'
              "
              (pressed)="setTheme(opt.value)"
            >
              {{ opt.label }}
            </viking-button>
          }
        </div>
      </section>

      <section
        class="suite-preferences-section viking-preferences-section fj-preferences-section"
        aria-labelledby="viking-prefs-transfer"
      >
        <h3
          id="viking-prefs-transfer"
          class="suite-preferences-heading viking-preferences-heading fj-preferences-heading"
        >
          Export / import
        </h3>
        <p
          class="suite-preferences-lede viking-preferences-lede fj-preferences-lede"
        >
          Move theme, disclosure, and onboarding progress between browsers. Soft
          chrome only — never tokens or sealed data.
        </p>
        <viking-checkbox
          [checked]="includeRecent()"
          (checkedChange)="includeRecent.set($event)"
        >
          Include search history
        </viking-checkbox>
        <div
          class="suite-preferences-actions viking-preferences-actions fj-preferences-actions"
        >
          <viking-button
            type="button"
            variant="secondary"
            (pressed)="exportPack()"
          >
            Export local data
          </viking-button>
          <viking-button
            type="button"
            variant="secondary"
            (pressed)="pickImport('merge')"
          >
            Import (merge)
          </viking-button>
          <viking-button
            type="button"
            variant="outline"
            (pressed)="pickImport('replace')"
          >
            Import (replace)
          </viking-button>
        </div>
        <input
          #packFile
          type="file"
          accept="application/json,.json"
          class="suite-sr-only viking-sr-only fj-sr-only"
          (change)="onPackFile($event)"
        />
      </section>

      <section
        class="suite-preferences-section viking-preferences-section fj-preferences-section"
        aria-labelledby="viking-prefs-local"
      >
        <h3
          id="viking-prefs-local"
          class="suite-preferences-heading viking-preferences-heading fj-preferences-heading"
        >
          Local data
        </h3>
        <div
          class="suite-preferences-actions viking-preferences-actions fj-preferences-actions"
        >
          <viking-button
            type="button"
            variant="secondary"
            (pressed)="prefs.resetDisclosure()"
          >
            Reset advanced sections
          </viking-button>
          <viking-button
            type="button"
            variant="secondary"
            (pressed)="prefs.clearSearchHistory()"
          >
            Clear search history
          </viking-button>
          <viking-button
            type="button"
            variant="danger"
            (pressed)="prefs.resetAll()"
          >
            Reset all preferences
          </viking-button>
        </div>
      </section>

      <section
        class="suite-preferences-section viking-preferences-section fj-preferences-section"
        aria-labelledby="viking-prefs-activity"
      >
        <h3
          id="viking-prefs-activity"
          class="suite-preferences-heading viking-preferences-heading fj-preferences-heading"
        >
          Recent activity
        </h3>
        <p
          class="suite-preferences-lede viking-preferences-lede fj-preferences-lede"
        >
          Important soft-chrome actions on this device. Metadata only — not a
          server audit trail.
        </p>
        <viking-activity-list [entries]="prefs.activityEntries()" />
        @if (prefs.activityEntries().length > 0) {
          <div
            class="suite-preferences-actions viking-preferences-actions fj-preferences-actions"
          >
            <viking-button
              type="button"
              variant="ghost"
              (pressed)="prefs.clearActivity()"
            >
              Clear activity
            </viking-button>
          </div>
        }
      </section>

      <viking-callout tone="info" heading="Keyboard">
        Press <viking-kbd>⌘</viking-kbd>/<viking-kbd>Ctrl</viking-kbd
        ><viking-kbd>,</viking-kbd> to open preferences, or
        <viking-kbd>?</viking-kbd> for all shortcuts.
      </viking-callout>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class VikingPreferencesPanel {
  protected readonly prefs = inject(VikingPreferencesService);
  private readonly packFile =
    viewChild<ElementRef<HTMLInputElement>>("packFile");

  protected readonly includeRecent = signal(false);
  private importMode: "merge" | "replace" = "merge";

  protected readonly themeOptions: {
    readonly value: SuiteThemePreference;
    readonly label: string;
  }[] = [
    { value: "system", label: "System" },
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
  ];

  protected setTheme(value: SuiteThemePreference): void {
    this.prefs.setTheme(value);
  }

  protected exportPack(): void {
    this.prefs.exportDataPack({
      includeRecentSearches: this.includeRecent(),
    });
  }

  protected pickImport(mode: "merge" | "replace"): void {
    this.importMode = mode;
    const input = this.packFile()?.nativeElement;
    if (!input) {
      return;
    }
    input.value = "";
    input.click();
  }

  protected onPackFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    void this.prefs.importDataPack(file, this.importMode);
  }
}
