import { Component, inject, ChangeDetectionStrategy, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

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
    MatIconModule,
  ],
  templateUrl: './login-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './login-dialog.scss',
})
export class LoginDialog implements OnInit {
  private fb = inject(FormBuilder);
  public dialogRef = inject(MatDialogRef<LoginDialog>);
  private authService = inject(AuthService);
  public data = inject(MAT_DIALOG_DATA, { optional: true });

  isRegisterMode = signal<boolean>(false);
  isForgotMode = signal<boolean>(false);
  isResetMode = signal<boolean>(false);

  successMessage = signal<string | null>(null);

  loginForm: FormGroup = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
    email: ['']
  });

  error = signal<string | null>(null);

  ngOnInit() {
    if (this.data && this.data.mode === 'reset') {
      this.isResetMode.set(true);
      // Adjust validators for Reset Mode: only new password is required
      this.loginForm.get('username')?.clearValidators();
      this.loginForm.get('username')?.updateValueAndValidity();
      this.loginForm.get('password')?.setValidators([Validators.required]);
      this.loginForm.get('password')?.updateValueAndValidity();
    }
  }

  toggleMode(): void {
    if (this.isForgotMode()) {
      this.isForgotMode.set(false);
      this.isRegisterMode.set(false);
    } else {
      this.isRegisterMode.update(val => !val);
    }
    this.error.set(null);
    this.successMessage.set(null);
  }

  switchToForgot(): void {
    this.isForgotMode.set(true);
    this.isRegisterMode.set(false);
    this.error.set(null);
    this.successMessage.set(null);
    // Adjust validators for forgot mode: only email is required
    this.loginForm.get('username')?.clearValidators();
    this.loginForm.get('username')?.updateValueAndValidity();
    this.loginForm.get('password')?.clearValidators();
    this.loginForm.get('password')?.updateValueAndValidity();
    this.loginForm.get('email')?.setValidators([Validators.required, Validators.email]);
    this.loginForm.get('email')?.updateValueAndValidity();
  }

  switchToLogin(): void {
    this.isForgotMode.set(false);
    this.isRegisterMode.set(false);
    this.isResetMode.set(false);
    this.error.set(null);
    this.successMessage.set(null);
    // Reset to normal validators
    this.loginForm.get('username')?.setValidators([Validators.required]);
    this.loginForm.get('username')?.updateValueAndValidity();
    this.loginForm.get('password')?.setValidators([Validators.required]);
    this.loginForm.get('password')?.updateValueAndValidity();
    this.loginForm.get('email')?.clearValidators();
    this.loginForm.get('email')?.updateValueAndValidity();
  }

  async onSubmit() {
    if (this.loginForm.invalid) return;

    this.error.set(null);
    this.successMessage.set(null);

    if (this.isForgotMode()) {
      const email = this.loginForm.value.email;
      const success = await this.authService.forgotPassword(email);
      if (success) {
        this.successMessage.set('If that email exists in our records, we have sent a password reset link.');
      } else {
        this.error.set('Failed to submit request. Please try again.');
      }
    } else if (this.isResetMode()) {
      const newPassword = this.loginForm.value.password;
      const success = await this.authService.resetPassword({
        uid: this.data.uid,
        token: this.data.token,
        new_password: newPassword
      });
      if (success) {
        this.successMessage.set('Password successfully reset! You can now log in.');
        setTimeout(() => {
          this.switchToLogin();
        }, 3000);
      } else {
        this.error.set('Failed to reset password. The link may have expired or is invalid.');
      }
    } else {
      let result;
      if (this.isRegisterMode()) {
        result = await this.authService.register({
          username: this.loginForm.value.username,
          password: this.loginForm.value.password,
          email: this.loginForm.value.email
        });
      } else {
        result = await this.authService.login({
          username: this.loginForm.value.username,
          password: this.loginForm.value.password
        });
      }
      
      if (result.success) {
        this.dialogRef.close(true);
      } else {
        this.error.set(result.error || 'Authentication failed.');
      }
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}


