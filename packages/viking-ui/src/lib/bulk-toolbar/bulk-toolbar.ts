import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from "@angular/core";
import { VikingButton } from "../button/button";

export type VikingBulkAction = {
  readonly id: string;
  readonly label: string;
  readonly variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  readonly disabled?: boolean;
};

/**
 * Non-modal bulk action bar — appears when list rows are selected (FORJD ADR-0021).
 */
@Component({
  selector: "viking-bulk-toolbar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [VikingButton],
  template: `
    @if (count() > 0) {
      <div
        class="suite-bulk-toolbar viking-bulk-toolbar fj-bulk-toolbar"
        role="region"
        [attr.aria-label]="ariaLabel()"
      >
        <p
          class="suite-bulk-toolbar-count viking-bulk-toolbar-count fj-bulk-toolbar-count"
        >
          {{ count() }} selected
        </p>
        <div
          class="suite-bulk-toolbar-actions viking-bulk-toolbar-actions fj-bulk-toolbar-actions"
        >
          @for (action of actions(); track action.id) {
            <viking-button
              type="button"
              [variant]="action.variant ?? 'secondary'"
              [disabled]="action.disabled ?? false"
              (pressed)="actionClick.emit(action.id)"
            >
              {{ action.label }}
            </viking-button>
          }
          <viking-button type="button" variant="ghost" (pressed)="clear.emit()">
            Clear
          </viking-button>
        </div>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: contents;
      }
    `,
  ],
})
export class VikingBulkToolbar {
  readonly count = input(0);
  readonly actions = input<readonly VikingBulkAction[]>([]);
  readonly ariaLabel = input("Bulk actions");
  readonly actionClick = output<string>();
  readonly clear = output<void>();
}
