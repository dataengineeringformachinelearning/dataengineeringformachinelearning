import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { recordSuiteActivity } from "../../core/activity-log";
import {
  SUITE_EMPTY_GUIDANCE_EYEBROW,
  getDefaultOnboardingStore,
  type OnboardingStore,
  type SuiteOnboardingFlow,
} from "../../core/onboarding";
import { vikingUid } from "../../core/uid";
import { safeHref } from "../../core/safe-href";
import { VikingButton } from "../button/button";

/** One checklist row for first-time guidance (FORJD ADR-0025). */
export type VikingOnboardingStep = {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  /** In-app route (preferred) or absolute http(s) URL. */
  readonly href?: string;
  readonly routerLink?: string | readonly string[];
  readonly actionLabel?: string;
};

/**
 * First-time onboarding checklist — persists via createOnboardingStore
 * (FORJD ADR-0025). Chrome: suite-components.css (`.suite-onboarding`).
 * Empty surfaces should keep using viking-empty-state with
 * SUITE_EMPTY_GUIDANCE_EYEBROW.
 */
@Component({
  selector: "viking-onboarding-checklist",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [VikingButton, RouterLink],
  host: {
    class: "suite-onboarding viking-onboarding fj-onboarding",
    "[attr.data-complete]": 'allDone() ? "true" : null',
    "[hidden]": "hidden()",
  },
  template: `
    @if (!hidden()) {
      <header
        class="suite-onboarding-header viking-onboarding-header fj-onboarding-header"
      >
        <div
          class="suite-onboarding-copy viking-onboarding-copy fj-onboarding-copy"
        >
          <p
            class="suite-onboarding-eyebrow viking-onboarding-eyebrow fj-onboarding-eyebrow"
          >
            {{ eyebrow() }}
          </p>
          <h2
            class="suite-onboarding-title viking-onboarding-title fj-onboarding-title"
            [id]="titleId"
          >
            {{ heading() }}
          </h2>
          @if (description()) {
            <p
              class="suite-onboarding-description viking-onboarding-description fj-onboarding-description"
            >
              {{ description() }}
            </p>
          }
        </div>
        <p
          class="suite-onboarding-progress viking-onboarding-progress fj-onboarding-progress"
          aria-live="polite"
        >
          {{ completedCount() }} of {{ steps().length }} complete
        </p>
      </header>

      <ol
        class="suite-onboarding-list viking-onboarding-list fj-onboarding-list"
        [attr.aria-labelledby]="titleId"
      >
        @for (step of steps(); track step.id) {
          <li
            class="suite-onboarding-item viking-onboarding-item fj-onboarding-item"
            [attr.data-done]="isDone(step.id) ? 'true' : null"
          >
            <label
              class="suite-onboarding-row viking-onboarding-row fj-onboarding-row"
            >
              <input
                type="checkbox"
                class="suite-onboarding-check viking-onboarding-check fj-onboarding-check"
                [checked]="isDone(step.id)"
                (change)="toggleStep(step.id, $event)"
              />
              <span
                class="suite-onboarding-body viking-onboarding-body fj-onboarding-body"
              >
                <span
                  class="suite-onboarding-step-title viking-onboarding-step-title fj-onboarding-step-title"
                  >{{ step.title }}</span
                >
                @if (step.description) {
                  <span
                    class="suite-onboarding-step-detail viking-onboarding-step-detail fj-onboarding-step-detail"
                    >{{ step.description }}</span
                  >
                }
              </span>
            </label>
            @if (step.routerLink; as link) {
              <a
                class="suite-onboarding-action viking-onboarding-action fj-onboarding-action"
                [routerLink]="link"
                (click)="onAction(step.id)"
              >
                {{ step.actionLabel || "Open" }}
              </a>
            } @else if (stepHref(step); as href) {
              <a
                class="suite-onboarding-action viking-onboarding-action fj-onboarding-action"
                [href]="href"
                (click)="onAction(step.id)"
              >
                {{ step.actionLabel || "Open" }}
              </a>
            }
          </li>
        }
      </ol>

      <footer
        class="suite-onboarding-footer viking-onboarding-footer fj-onboarding-footer"
      >
        @if (allDone()) {
          <viking-button variant="primary" type="button" (pressed)="finish()">
            {{ finishLabel() }}
          </viking-button>
        }
        @if (dismissible()) {
          <viking-button variant="ghost" type="button" (pressed)="dismiss()">
            {{ dismissLabel() }}
          </viking-button>
        }
      </footer>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      :host[hidden] {
        display: none;
      }
    `,
  ],
})
export class VikingOnboardingChecklist {
  private readonly destroyRef = inject(DestroyRef);
  private store: OnboardingStore = getDefaultOnboardingStore();

  readonly flowId = input<SuiteOnboardingFlow>(null);
  readonly heading = input("Getting started");
  readonly description = input("");
  readonly eyebrow = input(SUITE_EMPTY_GUIDANCE_EYEBROW);
  readonly steps = input.required<readonly VikingOnboardingStep[]>();
  readonly dismissible = input(true);
  readonly dismissLabel = input("Dismiss");
  readonly finishLabel = input("I'm done");
  /** Hide when the store says the guide should not show (completed / dismissed). */
  readonly autoHide = input(true);

  readonly stepChange = output<{
    readonly id: string;
    readonly complete: boolean;
  }>();
  readonly dismissed = output<void>();
  readonly completed = output<void>();

  protected readonly titleId = vikingUid("viking-onboarding-title");
  protected readonly tick = signal(0);

  protected readonly completedCount = computed(() => {
    this.tick();
    return this.steps().filter((s) => this.store.isStepComplete(s.id)).length;
  });

  protected readonly allDone = computed(() => {
    this.tick();
    const list = this.steps();
    return (
      list.length > 0 && list.every((s) => this.store.isStepComplete(s.id))
    );
  });

  protected readonly hidden = computed(() => {
    this.tick();
    if (!this.autoHide()) {
      return false;
    }
    return !this.store.shouldShowGuide();
  });

  constructor() {
    effect(() => {
      const flow = this.flowId();
      if (flow) {
        this.store.setActiveFlow(flow);
      }
    });
    const unsub = this.store.subscribe(() => {
      this.tick.update((n) => n + 1);
    });
    this.destroyRef.onDestroy(unsub);
  }

  protected isDone(id: string): boolean {
    this.tick();
    return this.store.isStepComplete(id);
  }

  protected stepHref(step: VikingOnboardingStep): string | null {
    if (!step.href) {
      return null;
    }
    return safeHref(step.href);
  }

  protected toggleStep(id: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.store.completeStep(id);
    } else {
      this.store.incompleteStep(id);
    }
    this.stepChange.emit({ id, complete: checked });
    this.tick.update((n) => n + 1);
  }

  protected onAction(id: string): void {
    this.store.completeStep(id);
    this.stepChange.emit({ id, complete: true });
    this.tick.update((n) => n + 1);
  }

  protected finish(): void {
    this.store.markComplete();
    recordSuiteActivity({
      kind: "onboarding.complete",
      label: "Completed onboarding checklist",
      detail: this.flowId() ?? undefined,
      source: "deml",
    });
    this.completed.emit();
    this.tick.update((n) => n + 1);
  }

  protected dismiss(): void {
    this.store.markDismissed();
    recordSuiteActivity({
      kind: "onboarding.dismiss",
      label: "Dismissed onboarding checklist",
      detail: this.flowId() ?? undefined,
      source: "deml",
    });
    this.dismissed.emit();
    this.tick.update((n) => n + 1);
  }
}
