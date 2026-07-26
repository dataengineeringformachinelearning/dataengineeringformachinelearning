import { Observable, of, shareReplay, finalize, tap } from 'rxjs';

/** Tunables for stale-while-revalidate memory entries. */
export type SwrOptions = {
  /** Serve without network when younger than this (ms). Default 30s. */
  freshMs?: number;
  /** Serve immediately then revalidate when younger than this (ms). Default 5m. */
  staleMs?: number;
  /** Logical group for bulk invalidate (e.g. `tenant:…`, `auth`). */
  scope?: string;
};

type SwrEntry<T> = {
  data: T;
  fetchedAt: number;
  scope?: string;
};

const DEFAULT_FRESH_MS = 30_000;
const DEFAULT_STALE_MS = 5 * 60_000;

/**
 * In-memory stale-while-revalidate cache.
 * Authed payloads stay in RAM only — clear on logout / user switch.
 */
export class MemorySwrCache {
  private readonly entries = new Map<string, SwrEntry<unknown>>();
  private readonly inflight = new Map<string, Observable<unknown>>();

  get<T>(key: string): SwrEntry<T> | undefined {
    return this.entries.get(key) as SwrEntry<T> | undefined;
  }

  set<T>(key: string, data: T, scope?: string): void {
    this.entries.set(key, { data, fetchedAt: Date.now(), scope });
  }

  /** Drop keys by exact key, key prefix (`overview:`), or scope (`scope:tenant:…`). */
  invalidate(keyOrPrefix: string): void {
    if (keyOrPrefix.startsWith('scope:')) {
      const scope = keyOrPrefix.slice('scope:'.length);
      for (const [key, entry] of this.entries) {
        if (entry.scope === scope) {
          this.entries.delete(key);
        }
      }
      return;
    }
    if (this.entries.has(keyOrPrefix)) {
      this.entries.delete(keyOrPrefix);
      return;
    }
    for (const key of this.entries.keys()) {
      if (key.startsWith(keyOrPrefix)) {
        this.entries.delete(key);
      }
    }
  }

  clear(): void {
    this.entries.clear();
    this.inflight.clear();
  }

  size(): number {
    return this.entries.size;
  }

  /**
   * SWR Observable:
   * - fresh → emit cache, no network
   * - stale → emit cache, then revalidate (keep stale on network error)
   * - miss / expired → single in-flight network fetch
   */
  observe<T>(key: string, fetcher: () => Observable<T>, options: SwrOptions = {}): Observable<T> {
    const freshMs = options.freshMs ?? DEFAULT_FRESH_MS;
    const staleMs = options.staleMs ?? DEFAULT_STALE_MS;
    const entry = this.get<T>(key);
    const age = entry ? Date.now() - entry.fetchedAt : Number.POSITIVE_INFINITY;

    if (entry && age < freshMs) {
      return of(entry.data);
    }

    const network$ = this.dedupe(key, () =>
      fetcher().pipe(tap(data => this.set(key, data, options.scope))),
    );

    if (entry && age < staleMs) {
      const stale = entry.data;
      return new Observable<T>(subscriber => {
        subscriber.next(stale);
        const sub = network$.subscribe({
          next: value => {
            subscriber.next(value);
            subscriber.complete();
          },
          error: () => {
            // Keep serving stale on revalidate failure.
            subscriber.complete();
          },
        });
        return () => sub.unsubscribe();
      });
    }

    return network$;
  }

  private dedupe<T>(key: string, create: () => Observable<T>): Observable<T> {
    const existing = this.inflight.get(key) as Observable<T> | undefined;
    if (existing) {
      return existing;
    }
    // shareReplay + deferred inflight clear so sync dual-subscribers still dedupe.
    const created = create().pipe(
      shareReplay({ bufferSize: 1, refCount: false }),
      finalize(() => {
        queueMicrotask(() => this.inflight.delete(key));
      }),
    );
    this.inflight.set(key, created as Observable<unknown>);
    return created;
  }
}

/** Stable cache key helper — include every dimension that changes the response. */
export function swrKey(
  namespace: string,
  parts: Record<string, string | number | boolean | null | undefined>,
): string {
  const pairs = Object.keys(parts)
    .sort()
    .map(k => `${k}=${parts[k] ?? ''}`)
    .join('&');
  return `${namespace}?${pairs}`;
}
