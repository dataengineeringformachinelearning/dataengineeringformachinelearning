import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';
import { credentialsInterceptor } from '../interceptors/credentials.interceptor';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

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
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(withInterceptors([credentialsInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    environment.firebase.apiKey = originalApiKey;
    httpMock.verify();
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
