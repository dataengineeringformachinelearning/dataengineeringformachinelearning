import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { VikingButton } from "../button/button";
import { VikingField } from "../field/field";
import { VikingIcon } from "../icon/icon";
import { VikingInput } from "../input/input";
import { VikingModal } from "../modal/modal";
import { VikingText } from "../typography/text";
import type { VikingIconName } from "../../core/icons";
import { VikingConfirmDialogData, VikingDialogService } from "./dialog.service";

/**
 * viking-confirm-dialog — alert / confirm / prompt modal wired to VikingDialogService.
 */
@Component({
  selector: "viking-confirm-dialog",
  imports: [
    FormsModule,
    VikingModal,
    VikingButton,
    VikingField,
    VikingInput,
    VikingText,
    VikingIcon,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (data(); as dialogData) {
      <viking-modal
        [open]="open()"
        [heading]="heading()"
        (openChange)="onOpenChange($event)"
      >
        <div class="viking-confirm-body">
          <div class="viking-confirm-title-row">
            <viking-icon [name]="iconName()" [size]="24" />
            <viking-text>{{ dialogData.message }}</viking-text>
          </div>
          @if (dialogData.type === "prompt" && dialogData.confirmText) {
            <viking-field
              label="Verification text"
              [description]="'Type ' + dialogData.confirmText + ' to proceed'"
            >
              <viking-input
                [ngModel]="inputValue()"
                (ngModelChange)="inputValue.set($event)"
                autocomplete="off"
                (keyup.enter)="onConfirm()"
              />
            </viking-field>
          }
        </div>
        <div vikingModalActions>
          @if (dialogData.type !== "alert") {
            <viking-button variant="outline" (pressed)="onCancel()">
              {{ dialogData.cancelBtnText || "Cancel" }}
            </viking-button>
          }
          <viking-button
            [variant]="
              dialogData.confirmBtnColor === 'warn' ? 'danger' : 'primary'
            "
            [disabled]="!isValid()"
            [icon]="
              dialogData.type === 'alert'
                ? 'check-circle'
                : dialogData.confirmBtnColor === 'warn'
                  ? 'trash'
                  : 'check'
            "
            (pressed)="onConfirm()"
          >
            {{
              dialogData.confirmBtnText ||
                (dialogData.type === "alert" ? "OK" : "Confirm")
            }}
          </viking-button>
        </div>
      </viking-modal>
    }
  `,
  styles: [
    `
      .viking-confirm-body {
        display: flex;
        flex-direction: column;
        gap: var(--viking-space-2);
      }
      .viking-confirm-title-row {
        display: flex;
        align-items: center;
        gap: var(--viking-space-2);
      }
    `,
  ],
})
export class VikingConfirmDialog {
  constructor(private readonly vikingDialog: VikingDialogService) {}

  protected readonly inputValue = signal<string>("");

  protected readonly data = computed(() => {
    const active = this.vikingDialog.active();
    return active?.kind === "confirm"
      ? (active.data as VikingConfirmDialogData)
      : null;
  });

  protected readonly open = computed(() => this.data() !== null);

  protected readonly heading = computed(() => {
    const data = this.data();
    if (!data) return "";
    return (
      data.title ??
      (data.type === "alert"
        ? "Notice"
        : data.type === "prompt"
          ? "Verification Required"
          : "Confirm Action")
    );
  });

  protected readonly iconName = computed((): VikingIconName => {
    const data = this.data();
    if (!data) return "info";
    if (data.type === "alert") return "info";
    if (data.confirmBtnColor === "warn") return "alert-triangle";
    return "info";
  });

  protected readonly isValid = computed(() => {
    const data = this.data();
    if (!data || data.type !== "prompt" || !data.confirmText) {
      return true;
    }
    return this.inputValue() === data.confirmText;
  });

  protected onCancel = (): void => {
    this.inputValue.set("");
    this.vikingDialog.resolveConfirm(false);
  };

  protected onConfirm = (): void => {
    if (!this.isValid()) return;
    this.inputValue.set("");
    this.vikingDialog.resolveConfirm(true);
  };

  protected onOpenChange = (next: boolean): void => {
    if (!next) {
      this.onCancel();
    }
  };
}

export type { VikingConfirmDialogData };
