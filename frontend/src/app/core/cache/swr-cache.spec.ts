import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { Observable, of, throwError } from 'rxjs';
import { MemorySwrCache, swrKey } from './swr-cache';

describe('MemorySwrCache', () => {
  let cache: MemorySwrCache;

  beforeEach(() => {
    cache = new MemorySwrCache();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-26T15:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('builds stable keys', () => {
    expect(swrKey('overview', { tenant: 'a', site: 'x' })).toBe('overview?site=x&tenant=a');
  });

  it('serves fresh entries without calling the fetcher', () => {
    cache.set('k', { n: 1 });
    const fetcher = vi.fn(() => of({ n: 2 }));
    const values: unknown[] = [];
    cache.observe('k', fetcher, { freshMs: 60_000 }).subscribe(v => values.push(v));
    expect(values).toEqual([{ n: 1 }]);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('emits stale then revalidated data (SWR)', () => {
    cache.set('k', { n: 1 });
    vi.setSystemTime(new Date('2026-07-26T15:00:45Z')); // 45s later
    const fetcher = vi.fn(
      () =>
        new Observable<{ n: number }>(sub => {
          sub.next({ n: 2 });
          sub.complete();
        }),
    );
    const values: unknown[] = [];
    cache
      .observe('k', fetcher, { freshMs: 30_000, staleMs: 120_000 })
      .subscribe(v => values.push(v));
    expect(values).toEqual([{ n: 1 }, { n: 2 }]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('keeps stale data when revalidate fails', () => {
    cache.set('k', { n: 1 });
    vi.setSystemTime(new Date('2026-07-26T15:00:45Z'));
    const values: unknown[] = [];
    let errored = false;
    cache
      .observe('k', () => throwError(() => new Error('network')), {
        freshMs: 10_000,
        staleMs: 120_000,
      })
      .subscribe({
        next: v => values.push(v),
        error: () => {
          errored = true;
        },
      });
    expect(values).toEqual([{ n: 1 }]);
    expect(errored).toBe(false);
  });

  it('dedupes in-flight fetches', () => {
    let subs = 0;
    const fetcher = () =>
      new Observable<number>(subscriber => {
        subs += 1;
        subscriber.next(7);
        subscriber.complete();
      });
    const a: number[] = [];
    const b: number[] = [];
    cache.observe('dup', fetcher, { freshMs: 0, staleMs: 0 }).subscribe(v => a.push(v));
    cache.observe('dup', fetcher, { freshMs: 0, staleMs: 0 }).subscribe(v => b.push(v));
    expect(subs).toBe(1);
    expect(a).toEqual([7]);
    expect(b).toEqual([7]);
  });

  it('invalidates by scope', () => {
    cache.set('a', 1, 'tenant:1');
    cache.set('b', 2, 'tenant:2');
    cache.invalidate('scope:tenant:1');
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')?.data).toBe(2);
  });
});
