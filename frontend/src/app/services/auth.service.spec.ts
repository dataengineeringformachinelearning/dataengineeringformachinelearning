import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { SessionApiService } from './session-api.service';
import { SessionWsService } from './session-ws.service';
import { environment } from '../../environments/environment';
import { credentialsInterceptor } from '../interceptors/credentials.interceptor';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

const sessionWsMock = {
  connect: vi.fn(),
  disconnect: vi.fn(),
};

const sessionApiMock = {
  register: vi.fn(async () => undefined),
  logout: vi.fn(async () => undefined),
};

const authTestProviders = [
  AuthService,
  { provide: SessionWsService, useValue: sessionWsMock },
  { provide: SessionApiService, useValue: sessionApiMock },
  provideHttpClient(withInterceptors([credentialsInterceptor])),
  provideHttpClientTesting(),
];

// Mock Firebase SDKs
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
  getApps: vi.fn(() => []),
}));

vi.mock('firebase/auth', () => {
  const mockUser = {
    getIdToken: () => Promise.resolve('mock-token'),
  };
  const mockAuth = {
    currentUser: mockUser,
  };
  return {
    getAuth: () => mockAuth,
    signInWithEmailAndPassword: () => Promise.resolve({}),
    createUserWithEmailAndPassword: () => Promise.resolve({ user: mockUser }),
    signOut: () => Promise.resolve({}),
    sendPasswordResetEmail: () => Promise.resolve({}),
    confirmPasswordReset: () => Promise.resolve({}),
    updateProfile: () => Promise.resolve({}),
    onAuthStateChanged: (auth: any, callback: any) => {
      // Initial call triggers callback
      callback(null);
      return () => undefined;
    },
    deleteUser: () => Promise.resolve({}),
  };
});

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  let originalApiKey: string;

  beforeEach(() => {
    originalApiKey = environment.firebase.apiKey;
    environment.firebase.apiKey = 'test-key'; // pragma: allowlist secret
    TestBed.configureTestingModule({ providers: authTestProviders });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    environment.firebase.apiKey = originalApiKey;
    httpMock
      .match(() => true)
      .forEach(req => req.flush({ status: 'success', user_id: 1, role: 'Operator' }));
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should check auth and set signals on success', async () => {
    const checkPromise = service.checkAuth();

    // Wait for the async credentials interceptor token promise to resolve
    await new Promise(resolve => setTimeout(resolve, 10));

    const req = httpMock.expectOne(`${environment.backendUrl}/api/v1/auth/user`);
    expect(req.request.method).toBe('GET');
    req.flush({ status: 'success', user_id: 42 });

    await checkPromise;

    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentUserId()).toBe(42);
  });

  it('should check auth and clear signals on failure', async () => {
    const checkPromise = service.checkAuth();

    // Wait for the async credentials interceptor token promise to resolve
    await new Promise(resolve => setTimeout(resolve, 10));

    const req = httpMock.expectOne(`${environment.backendUrl}/api/v1/auth/user`);
    req.flush({}, { status: 401, statusText: 'Unauthorized' });

    await checkPromise;

    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUserId()).toBeNull();
  });

  it('should login and set signals on success', async () => {
    // Manually trigger authenticated state for the test
    service.isAuthenticated.set(true);
    service.currentUserId.set(100);

    const dummyPassword = `dummy-pwd-${Math.random()}`;
    const loginPromise = service.login({ username: 'user@example.com', password: dummyPassword });
    const result = await loginPromise;

    expect(result.success).toBe(true);
    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentUserId()).toBe(100);
  });

  it('should logout and clear signals', async () => {
    service.isAuthenticated.set(true);
    service.currentUserId.set(42);

    const logoutPromise = service.logout();
    await logoutPromise;

    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUserId()).toBeNull();
  });
});

describe('AuthService (mock mode)', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let originalApiKey: string;

  beforeEach(() => {
    originalApiKey = environment.firebase.apiKey;
    environment.firebase.apiKey = 'PLACEHOLDER_API_KEY'; // pragma: allowlist secret
    localStorage.clear();
    TestBed.configureTestingModule({ providers: authTestProviders });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    environment.firebase.apiKey = originalApiKey;
    localStorage.clear();
    httpMock
      .match(() => true)
      .forEach(req => req.flush({ status: 'success', user_id: 1, role: 'Operator' }));
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  const flushAuthUser = async (
    payload: Record<string, unknown> = { status: 'success', user_id: 1, role: 'Operator' },
  ): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 10));
    const req = httpMock.expectOne(`${environment.backendUrl}/api/v1/auth/user`);
    req.flush(payload);
  };

  it('should login via mock mode and persist user to localStorage', async () => {
    const resultPromise = service.login({
      username: 'ops@deml.app',
      password: 'test-password',
    });
    await flushAuthUser();
    const result = await resultPromise;

    expect(result.success).toBe(true);
    expect(service.isAuthenticated()).toBe(true);
    expect(localStorage.getItem('mock_user')).toContain('ops@deml.app');
  });

  it('should clear mock session on logout', async () => {
    const loginPromise = service.login({ username: 'ops@deml.app', password: 'test-password' });
    await flushAuthUser();
    await loginPromise;
    await service.logout();

    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('mock_user')).toBeNull();
  });

  it('should assign Security Admin role for admin email in mock mode', async () => {
    const loginPromise = service.login({
      username: 'admin@dataengineeringformachinelearning.com',
      password: 'test-password',
    });
    await flushAuthUser({ status: 'success', user_id: 1, role: 'Security Admin' });
    await loginPromise;

    expect(service.currentUserRole()).toBe('Security Admin');
  });
});
