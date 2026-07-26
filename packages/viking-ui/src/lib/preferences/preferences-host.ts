import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { VikingModal } from "../modal/modal";
import { VikingPreferencesPanel } from "./preferences-panel";
import { VikingPreferencesService } from "./preferences.service";

/** Preferences modal — open via ⌘, / Ctrl+, or VikingPreferencesService.show(). */
@Component({
  selector: "viking-preferences",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [VikingModal, VikingPreferencesPanel],
  template: `
    <viking-modal
      [open]="prefs.open()"
      (openChange)="prefs.setOpen($event)"
      heading="Preferences"
    >
      <viking-preferences-panel />
    </viking-modal>
  `,
  styles: [
    `
      :host {
        display: contents;
      }
    `,
  ],
})
export class VikingPreferences {
  protected readonly prefs = inject(VikingPreferencesService);
}
