import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../services/auth.service';
import { errorInterceptor } from './error.interceptor';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  const logout = vi.fn(async () => undefined);
  const navigate = vi.fn(async () => true);

  beforeEach(() => {
    logout.mockClear();
    navigate.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: () => true,
            logout,
          },
        },
        {
          provide: Router,
          useValue: { url: '/dashboard', navigate },
        },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('ignores 401 responses without an Authorization header', async () => {
    const failure = new Promise<unknown>((resolve, reject) => {
      http.get('/api/v1/public/thing').subscribe({ next: resolve, error: reject });
    });

    const req = httpMock.expectOne('/api/v1/public/thing');
    req.flush({ detail: 'nope' }, { status: 401, statusText: 'Unauthorized' });
    await expect(failure).rejects.toBeTruthy();
    expect(logout).not.toHaveBeenCalled();
  });

  it('logs out when an authorized request returns 401', async () => {
    const failure = new Promise<unknown>((resolve, reject) => {
      http
        .get('/api/v1/analytics/overview', {
          headers: { Authorization: 'Bearer expired' },
        })
        .subscribe({ next: resolve, error: reject });
    });

    const req = httpMock.expectOne('/api/v1/analytics/overview');
    req.flush({ detail: 'expired' }, { status: 401, statusText: 'Unauthorized' });
    await expect(failure).rejects.toBeTruthy();
    expect(logout).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    expect(navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/dashboard', reason: 'session' },
    });
  });
});
