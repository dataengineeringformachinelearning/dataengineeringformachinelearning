import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { FormGroup, Validators } from '@angular/forms';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Login } from './login';
import { AuthService } from '../../services/auth.service';

type LoginHarness = {
  loginForm: FormGroup;
  setMfaVerificationValidators: () => void;
};

const authServiceMock = {
  auth: null,
  isInitialized: signal(false),
  isAuthenticated: signal(false),
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
  register: vi.fn(),
  login: vi.fn(),
  loginWithApple: vi.fn(),
  loginWithGoogle: vi.fn(),
  refreshMfaState: vi.fn(),
};

describe('Login', () => {
  let harness: LoginHarness;
  let fixture: ComponentFixture<Login>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    // Private MFA helper is exercised via a narrow harness cast (not Login & private).
    harness = fixture.componentInstance as unknown as LoginHarness;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('allows MFA verification to depend only on the visible code input', () => {
    for (const controlName of ['username', 'password']) {
      const control = harness.loginForm.get(controlName);
      control?.setValue('');
      control?.setValidators([Validators.required]);
      control?.updateValueAndValidity();
    }

    harness.setMfaVerificationValidators();

    expect(harness.loginForm.valid).toBe(false);
    expect(harness.loginForm.get('username')?.hasError('required')).toBe(false);
    expect(harness.loginForm.get('password')?.hasError('required')).toBe(false);

    harness.loginForm.patchValue({ verificationCode: '123456' });

    expect(harness.loginForm.valid).toBe(true);
  });
});
