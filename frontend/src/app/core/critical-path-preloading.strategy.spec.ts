import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, firstValueFrom, isEmpty } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { CriticalPathPreloadingStrategy } from './critical-path-preloading.strategy';

describe('CriticalPathPreloadingStrategy', () => {
  let strategy: CriticalPathPreloadingStrategy;
  const isAuthenticated = signal(false);

  beforeEach(() => {
    // Make idle-prefetch synchronous in unit tests
    (
      globalThis as {
        requestIdleCallback?: (cb: () => void) => number;
        cancelIdleCallback?: (id: number) => void;
      }
    ).requestIdleCallback = (cb: () => void) => {
      cb();
      return 0;
    };
    (globalThis as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback = () =>
      undefined;

    TestBed.configureTestingModule({
      providers: [
        CriticalPathPreloadingStrategy,
        {
          provide: AuthService,
          useValue: { isAuthenticated },
        },
      ],
    });
    strategy = TestBed.inject(CriticalPathPreloadingStrategy);
    isAuthenticated.set(false);
  });

  it('skips routes without preload data', async () => {
    const empty = await firstValueFrom(
      strategy.preload({ path: 'x' }, () => of(true)).pipe(isEmpty()),
    );
    expect(empty).toBe(true);
  });

  it('preloads guest routes', async () => {
    let loaded = false;
    await firstValueFrom(
      strategy.preload({ path: 'login', data: { preload: 'guest' } }, () => {
        loaded = true;
        return of(true);
      }),
    );
    expect(loaded).toBe(true);
  });

  it('waits for auth before preloading auth routes', async () => {
    let loaded = false;
    const result = firstValueFrom(
      strategy.preload({ path: 'dashboard', data: { preload: 'auth' } }, () => {
        loaded = true;
        return of(true);
      }),
    );
    await Promise.resolve();
    expect(loaded).toBe(false);
    isAuthenticated.set(true);
    await result;
    expect(loaded).toBe(true);
  });
});
