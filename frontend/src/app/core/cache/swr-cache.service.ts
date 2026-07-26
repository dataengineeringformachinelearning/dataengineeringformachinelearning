import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { MemorySwrCache, SwrOptions, swrKey } from './swr-cache';

/**
 * App-wide in-memory SWR cache for read-mostly API responses.
 * Cleared on logout / user switch — never persists authed payloads to disk.
 */
@Injectable({ providedIn: 'root' })
export class SwrCacheService {
  private readonly cache = new MemorySwrCache();

  observe<T>(key: string, fetcher: () => Observable<T>, options?: SwrOptions): Observable<T> {
    return this.cache.observe(key, fetcher, options);
  }

  get<T>(key: string): T | undefined {
    return this.cache.get<T>(key)?.data;
  }

  set<T>(key: string, data: T, scope?: string): void {
    this.cache.set(key, data, scope);
  }

  invalidate(keyOrPrefix: string): void {
    this.cache.invalidate(keyOrPrefix);
  }

  /** Drop everything — call on logout / account switch. */
  clear(): void {
    this.cache.clear();
  }

  key(
    namespace: string,
    parts: Record<string, string | number | boolean | null | undefined>,
  ): string {
    return swrKey(namespace, parts);
  }
}
