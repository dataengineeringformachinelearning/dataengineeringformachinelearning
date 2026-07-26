import { Injectable, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { PreloadingStrategy, Route } from '@angular/router';
import { EMPTY, Observable, Subscriber, timer } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

/**
 * Route data.preload:
 * - true | 'guest' — idle-prefetch for everyone (login, explore, status)
 * - 'auth' — idle-prefetch only after the user is authenticated
 * - omitted — never preloaded by the strategy (hover may still prefetch)
 */
export type CriticalPathPreloadPolicy = boolean | 'auth' | 'guest';

// --- Idle helper (requestIdleCallback with timer fallback) ---
function whenIdle(timeoutMs = 2500): Observable<void> {
  return new Observable<void>((subscriber: Subscriber<void>) => {
    const g = globalThis as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof g.requestIdleCallback === 'function') {
      const id = g.requestIdleCallback(
        () => {
          subscriber.next();
          subscriber.complete();
        },
        { timeout: timeoutMs },
      );
      return () => g.cancelIdleCallback?.(id);
    }
    const sub = timer(Math.min(1200, timeoutMs)).subscribe(() => {
      subscriber.next();
      subscriber.complete();
    });
    return () => sub.unsubscribe();
  });
}

/**
 * Selective router preloading — critical paths only.
 * Avoids PreloadAllModules so guests do not download dashboard/analytics.
 */
@Injectable({ providedIn: 'root' })
export class CriticalPathPreloadingStrategy implements PreloadingStrategy {
  private readonly auth = inject(AuthService);
  private readonly authed$ = toObservable(this.auth.isAuthenticated);

  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    const policy = route.data?.['preload'] as CriticalPathPreloadPolicy | undefined;
    if (policy === undefined || policy === false) {
      return EMPTY;
    }

    const run = (): Observable<unknown> =>
      whenIdle().pipe(
        switchMap(() => load()),
        catchError(() => EMPTY),
      );

    if (policy === true || policy === 'guest') {
      return run();
    }

    if (policy === 'auth') {
      return this.authed$.pipe(
        filter(ok => ok === true),
        take(1),
        switchMap(() => run()),
      );
    }

    return EMPTY;
  }
}
