import { Component, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialog {
  public dialogRef = inject(MatDialogRef<ConfirmDialog>);
  public data: ConfirmDialogData = inject(MAT_DIALOG_DATA);

  inputValue = signal<string>('');

  get isValid(): boolean {
    if (this.data.type === 'prompt' && this.data.confirmText) {
      return this.inputValue() === this.data.confirmText;
    }
    return true;
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    if (this.isValid) {
      this.dialogRef.close(true);
    }
  }
}
