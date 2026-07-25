import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  it('redirects unauthenticated users to login with returnUrl', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            isInitialized: vi.fn(() => true),
            isAuthenticated: () => false,
          },
        },
      ],
    });

    const router = TestBed.inject(Router);
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/dashboard?tab=security' } as never),
    );

    expect(result).toEqual(
      router.createUrlTree(['/login'], {
        queryParams: { returnUrl: '/dashboard?tab=security' },
      }),
    );
  });

  it('allows authenticated users through', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            isInitialized: vi.fn(() => true),
            isAuthenticated: () => true,
          },
        },
      ],
    });

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/dashboard' } as never),
    );

    expect(result).toBe(true);
  });
});
