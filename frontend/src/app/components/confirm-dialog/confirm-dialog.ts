import { Component, inject, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  VikingButton,
  VikingField,
  VikingIcon,
  VikingInput,
  VikingModal,
  VikingText,
} from '@dataengineeringformachinelearning/viking-ui';
import { VikingDialogService } from '../../services/viking-dialog.service';
import type { VikingIconName } from '@dataengineeringformachinelearning/viking-ui';

export interface ConfirmDialogData {
  title?: string;
  message: string;
  type?: 'alert' | 'confirm' | 'prompt';
  confirmText?: string;
  confirmBtnText?: string;
  confirmBtnColor?: 'primary' | 'warn' | 'accent';
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    VikingModal,
    VikingButton,
    VikingField,
    VikingInput,
    VikingText,
    VikingIcon,
  ],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialog {
  private readonly fluxDialog = inject(VikingDialogService);

  protected readonly inputValue = signal<string>('');

  protected readonly data = computed(() => {
    const active = this.fluxDialog.active();
    return active?.kind === 'confirm' ? (active.data as ConfirmDialogData) : null;
  });

  protected readonly open = computed(() => this.data() !== null);

  protected readonly heading = computed(() => {
    const data = this.data();
    if (!data) return '';
    return (
      data.title ??
      (data.type === 'alert'
        ? 'Notice'
        : data.type === 'prompt'
          ? 'Verification Required'
          : 'Confirm Action')
    );
  });

  protected readonly iconName = computed((): VikingIconName => {
    const data = this.data();
    if (!data) return 'info';
    if (data.type === 'alert') return 'info';
    if (data.confirmBtnColor === 'warn') return 'alert-triangle';
    return 'info';
  });

  protected readonly isValid = computed(() => {
    const data = this.data();
    if (!data || data.type !== 'prompt' || !data.confirmText) {
      return true;
    }
    return this.inputValue() === data.confirmText;
  });

  protected onCancel = (): void => {
    this.inputValue.set('');
    this.fluxDialog.resolveConfirm(false);
  };

  protected onConfirm = (): void => {
    if (!this.isValid()) return;
    this.inputValue.set('');
    this.fluxDialog.resolveConfirm(true);
  };

  protected onOpenChange = (next: boolean): void => {
    if (!next) {
      this.onCancel();
    }
  };
}
