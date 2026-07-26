import { ChangeDetectionStrategy, Component, input } from "@angular/core";

/** One ordered step in a read-only pipeline visualization. */
export interface VikingPipelineStep {
  id: string;
  title: string;
  detail?: string;
  kind?: "process" | "detect" | "unknown" | string;
}

/**
 * viking-pipeline-flow — read-only visual sequence for workflow YAML steps.
 * Chrome: suite-components.css (`.suite-pipeline-flow` / triple prefixes).
 * Complex workflows stay YAML-owned; this renders the human card view only.
 */
@Component({
  selector: "viking-pipeline-flow",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: "list",
    class: "suite-pipeline-flow viking-pipeline-flow",
    "[attr.data-orientation]": "orientation()",
    "[attr.aria-label]": "label()",
  },
  template: `
    @if (steps().length === 0) {
      <p
        class="suite-pipeline-flow__empty viking-pipeline-flow__empty"
        role="status"
      >
        {{ emptyMessage() }}
      </p>
    } @else {
      @for (step of steps(); track step.id; let i = $index; let last = $last) {
        <div
          class="suite-pipeline-flow__step viking-pipeline-flow__step"
          role="listitem"
          [attr.data-kind]="step.kind || 'unknown'"
        >
          <div
            class="suite-pipeline-flow__rail viking-pipeline-flow__rail"
            aria-hidden="true"
          >
            <span
              class="suite-pipeline-flow__marker viking-pipeline-flow__marker"
              >{{ i + 1 }}</span
            >
            @if (!last) {
              <span
                class="suite-pipeline-flow__connector viking-pipeline-flow__connector"
              ></span>
            }
          </div>
          <div class="suite-pipeline-flow__body viking-pipeline-flow__body">
            <p class="suite-pipeline-flow__title viking-pipeline-flow__title">
              {{ step.title }}
            </p>
            @if (step.detail) {
              <p
                class="suite-pipeline-flow__detail viking-pipeline-flow__detail"
              >
                {{ step.detail }}
              </p>
            }
          </div>
        </div>
      }
    }
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        box-sizing: border-box;
      }
    `,
  ],
})
export class VikingPipelineFlow {
  readonly steps = input<readonly VikingPipelineStep[]>([]);
  readonly orientation = input<"vertical" | "horizontal">("horizontal");
  readonly label = input<string>("Pipeline steps");
  readonly emptyMessage = input<string>("No pipeline steps configured.");
}
