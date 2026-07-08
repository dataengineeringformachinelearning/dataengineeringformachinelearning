import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Validators } from '@angular/forms';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Login } from './login';
import { AuthService } from '../../services/auth.service';

type LoginTestComponent = Login & {
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
  let component: LoginTestComponent;
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
    component = fixture.componentInstance as LoginTestComponent;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('allows MFA verification to depend only on the visible code input', () => {
    for (const controlName of ['username', 'password']) {
      const control = component.loginForm.get(controlName);
      control?.setValue('');
      control?.setValidators([Validators.required]);
      control?.updateValueAndValidity();
    }

    component.setMfaVerificationValidators();

    expect(component.loginForm.valid).toBe(false);
    expect(component.loginForm.get('username')?.hasError('required')).toBe(false);
    expect(component.loginForm.get('password')?.hasError('required')).toBe(false);

    component.loginForm.patchValue({ verificationCode: '123456' });

    expect(component.loginForm.valid).toBe(true);
  });
});
