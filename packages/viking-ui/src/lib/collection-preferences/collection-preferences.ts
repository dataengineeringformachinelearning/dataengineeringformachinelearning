import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  output,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { VikingIcon } from "../icon/icon";

export interface VikingCollectionPreference {
  id: string;
  label: string;
  description?: string;
  sticky?: boolean;
}

export type VikingCollectionPreferenceSection = "table" | "density" | "sticky";

/**
 * viking-collection-preferences — table preferences dialog for column selection.
 * Based on Cloudscape Collection Preferences pattern, adapted for Viking-UI.
 * Used for configuring table views in analytics and dashboards.
 */
@Component({
  selector: "viking-collection-preferences",
  standalone: true,
  imports: [FormsModule, VikingIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="viking-collection-preferences">
      <header class="viking-collection-preferences__header">
        <h2 class="viking-collection-preferences__title">Preferences</h2>
      </header>
      <div class="viking-collection-preferences__body">
        @for (section of preferenceSections(); track section) {
          <section class="viking-collection-preferences__section">
            <h3 class="viking-collection-preferences__section-title">
              {{ sectionLabels[section] }}
            </h3>
            <div class="viking-collection-preferences__options">
              @for (option of getSectionOptions(section); track option.id) {
                <label class="viking-collection-preferences__option">
                  <input
                    type="checkbox"
                    class="viking-collection-preferences__checkbox"
                    [checked]="isOptionSelected(option.id)"
                    (change)="toggleOption(option.id, $event)"
                  />
                  <span class="viking-collection-preferences__label">{{
                    option.label
                  }}</span>
                  @if (option.description) {
                    <span class="viking-collection-preferences__description">{{
                      option.description
                    }}</span>
                  }
                </label>
              }
            </div>
          </section>
        }
      </div>
      <footer class="viking-collection-preferences__footer">
        <button
          type="button"
          class="viking-collection-preferences__button viking-collection-preferences__button--secondary"
          (click)="cancel.emit()"
        >
          Cancel
        </button>
        <button
          type="button"
          class="viking-collection-preferences__button viking-collection-preferences__button--primary"
          (click)="apply.emit(selected())"
        >
          Apply
        </button>
      </footer>
    </div>
  `,
  styles: [
    `
      :host(.viking-collection-preferences-wrapper) {
        display: block;
        font-family: var(--viking-font-family);
      }
      .viking-collection-preferences {
        display: flex;
        flex-direction: column;
        border: 1px solid var(--viking-border);
        border-radius: var(--viking-radius);
        background: var(--viking-surface);
        min-width: 280px;
      }
      .viking-collection-preferences__header {
        padding: var(--viking-space-2);
        border-bottom: 1px solid var(--viking-border);
      }
      .viking-collection-preferences__title {
        margin: 0;
        font-size: var(--viking-font-size-ui);
        font-weight: var(--viking-font-weight-bold);
        letter-spacing: var(--viking-letter-spacing-tight);
        color: var(--viking-text);
      }
      .viking-collection-preferences__body {
        flex: 1;
        padding: var(--viking-space-2);
        display: flex;
        flex-direction: column;
        gap: var(--viking-space-3);
      }
      .viking-collection-preferences__section {
        display: flex;
        flex-direction: column;
        gap: var(--viking-space-1);
      }
      .viking-collection-preferences__section-title {
        margin: 0;
        font-size: var(--viking-font-size-sm);
        font-weight: var(--viking-font-weight-semibold);
        letter-spacing: var(--viking-letter-spacing-wide);
        text-transform: uppercase;
        color: var(--viking-text-muted);
      }
      .viking-collection-preferences__options {
        display: flex;
        flex-direction: column;
        gap: var(--viking-space-1);
      }
      .viking-collection-preferences__option {
        display: flex;
        flex-direction: column;
        gap: var(--viking-space-0-5);
        padding: var(--viking-space-1);
        cursor: pointer;
        border-radius: var(--viking-radius-sm);
        transition: var(--viking-transition);
      }
      .viking-collection-preferences__option:hover {
        background: var(--viking-accent-soft);
      }
      .viking-collection-preferences__option:focus-within {
        background: var(--viking-accent-soft);
      }
      .viking-collection-preferences__checkbox {
        width: 16px;
        height: 16px;
        accent-color: var(--viking-accent);
        cursor: pointer;
      }
      .viking-collection-preferences__label {
        font-size: var(--viking-font-size);
        color: var(--viking-text);
      }
      .viking-collection-preferences__description {
        font-size: var(--viking-font-size-sm);
        color: var(--viking-text-muted);
      }
      .viking-collection-preferences__footer {
        display: flex;
        justify-content: flex-end;
        gap: var(--viking-space-1);
        padding: var(--viking-space-2);
        border-top: 1px solid var(--viking-border);
      }
      .viking-collection-preferences__button {
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size-sm);
        font-weight: var(--viking-font-weight-medium);
        padding: var(--viking-space-1) var(--viking-space-2);
        border-radius: var(--viking-radius-sm);
        cursor: pointer;
        transition: var(--viking-transition-interactive);
      }
      .viking-collection-preferences__button--primary {
        background: var(--viking-accent);
        color: var(--viking-on-accent);
        border: 1px solid transparent;
      }
      .viking-collection-preferences__button--primary:hover {
        background: var(--viking-accent-hover);
      }
      .viking-collection-preferences__button--secondary {
        background: transparent;
        color: var(--viking-text-muted);
        border: 1px solid var(--viking-border);
      }
      .viking-collection-preferences__button--secondary:hover {
        color: var(--viking-text);
        background: var(--viking-accent-soft);
      }
    `,
  ],
})
export class VikingCollectionPreferences {
  readonly preferences = input<VikingCollectionPreference[]>([]);
  readonly selected = model<string[]>([]);

  readonly apply = output<string[]>();
  readonly cancel = output<void>();

  protected readonly sectionLabels: Record<
    VikingCollectionPreferenceSection,
    string
  > = {
    table: "Table",
    density: "Density",
    sticky: "Sticky",
  };

  protected readonly preferenceSections = computed(
    () =>
      Object.keys(this.sectionLabels) as VikingCollectionPreferenceSection[],
  );

  protected isOptionSelected(id: string): boolean {
    return this.selected().includes(id);
  }

  protected toggleOption(id: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selected.update((items) =>
      input.checked ? [...items, id] : items.filter((item) => item !== id),
    );
  }

  protected getSectionOptions(
    section: VikingCollectionPreferenceSection,
  ): VikingCollectionPreference[] {
    return this.preferences().filter((opt) =>
      section === "table"
        ? !opt.sticky && !opt.description?.includes("density")
        : section === "density"
          ? opt.description?.includes("density")
          : opt.sticky,
    );
  }
}
