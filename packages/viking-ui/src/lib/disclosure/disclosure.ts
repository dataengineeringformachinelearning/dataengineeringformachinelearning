import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from "@angular/core";
import { VikingIcon } from "../icon/icon";
import {
  getDefaultDisclosureStore,
  type DisclosureStore,
} from "../../core/disclosure";
import { vikingUid } from "../../core/uid";

/**
 * Progressive disclosure panel — advanced content collapsed by default
 * (FORJD ADR-0022). Chrome: suite-components.css (`.suite-disclosure`).
 */
@Component({
  selector: "viking-disclosure",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [VikingIcon],
  template: `
    <div
      class="suite-disclosure viking-disclosure fj-disclosure"
      [attr.data-open]="open() ? 'true' : 'false'"
      [attr.data-level]="level()"
    >
      <button
        type="button"
        class="suite-disclosure-trigger viking-disclosure-trigger fj-disclosure-trigger"
        [id]="triggerId"
        [attr.aria-expanded]="open()"
        [attr.aria-controls]="panelId"
        (click)="toggle()"
      >
        <span
          class="suite-disclosure-copy viking-disclosure-copy fj-disclosure-copy"
        >
          @if (badge()) {
            <span
              class="suite-disclosure-badge viking-disclosure-badge fj-disclosure-badge"
              >{{ badge() }}</span
            >
          }
          <span
            class="suite-disclosure-heading viking-disclosure-heading fj-disclosure-heading"
            >{{ heading() }}</span
          >
          @if (description()) {
            <span
              class="suite-disclosure-description viking-disclosure-description fj-disclosure-description"
              >{{ description() }}</span
            >
          }
        </span>
        <viking-icon
          class="suite-disclosure-chevron viking-disclosure-chevron fj-disclosure-chevron"
          [name]="open() ? 'chevron-up' : 'chevron-down'"
          [size]="18"
        />
      </button>
      @if (open()) {
        <div
          class="suite-disclosure-panel viking-disclosure-panel fj-disclosure-panel"
          [id]="panelId"
          role="region"
          [attr.aria-labelledby]="triggerId"
        >
          <ng-content />
        </div>
      }
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
export class VikingDisclosure {
  private readonly destroyRef = inject(DestroyRef);
  private store: DisclosureStore = getDefaultDisclosureStore();

  /** Stable section id for persistence (e.g. `deml.settings.telemetry`). */
  readonly sectionId = input.required<string>();
  readonly heading = input.required<string>();
  readonly description = input("");
  /** Smart default when the user has never toggled this section. */
  readonly defaultOpen = input(false);
  /** Small label — default “Advanced” for progressive disclosure. */
  readonly badge = input("Advanced");
  readonly level = input<"default" | "inset">("default");

  protected readonly open = signal(false);
  protected readonly triggerId = vikingUid("viking-disclosure-trigger");
  protected readonly panelId = computed(() => `${this.triggerId}-panel`);

  constructor() {
    effect(() => {
      this.open.set(this.store.isOpen(this.sectionId(), this.defaultOpen()));
    });
    const unsub = this.store.subscribe(() => {
      this.open.set(this.store.isOpen(this.sectionId(), this.defaultOpen()));
    });
    this.destroyRef.onDestroy(unsub);
  }

  protected toggle(): void {
    this.store.toggle(this.sectionId(), this.defaultOpen());
    this.open.set(this.store.isOpen(this.sectionId(), this.defaultOpen()));
  }
}
