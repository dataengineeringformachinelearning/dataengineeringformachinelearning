import { Component, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './login-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './login-dialog.scss',
})
export class LoginDialog {
  private fb = inject(FormBuilder);
  public dialogRef = inject(MatDialogRef<LoginDialog>);

  isRegisterMode = signal<boolean>(false);

  loginForm: FormGroup = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
    email: ['']
  });

  error: string | null = null;

  toggleMode(): void {
    this.isRegisterMode.update(val => !val);
    this.error = null;
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.dialogRef.close({
        ...this.loginForm.value,
        mode: this.isRegisterMode() ? 'register' : 'login'
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}

