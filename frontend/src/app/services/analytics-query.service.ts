import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_ENDPOINTS } from '../core/constants/api.constants';
import { SwrCacheService } from '../core/cache/swr-cache.service';

/** Shared analytics GETs with in-memory stale-while-revalidate. */
@Injectable({ providedIn: 'root' })
export class AnalyticsQueryService {
  private readonly http = inject(HttpClient);
  private readonly swr = inject(SwrCacheService);

  getTenants<T>(): Observable<T> {
    const key = this.swr.key('analytics:tenants', {});
    return this.swr.observe(key, () => this.http.get<T>(API_ENDPOINTS.ANALYTICS.TENANTS), {
      freshMs: 60_000,
      staleMs: 10 * 60_000,
      scope: 'auth',
    });
  }

  /** Synchronous SWR peek for optimistic first paint. */
  peekTenants<T>(): T | undefined {
    return this.swr.get<T>(this.swr.key('analytics:tenants', {}));
  }

  getOverview<T>(tenantId?: string | null, siteUrl?: string | null): Observable<T> {
    const key = this.overviewKey(tenantId, siteUrl);
    const url = this.overviewUrl(tenantId, siteUrl);

    return this.swr.observe(key, () => this.http.get<T>(url), {
      freshMs: 15_000,
      staleMs: 2 * 60_000,
      scope: tenantId ? `tenant:${tenantId}` : 'auth',
    });
  }

  /** Synchronous SWR peek for optimistic first paint. */
  peekOverview<T>(tenantId?: string | null, siteUrl?: string | null): T | undefined {
    return this.swr.get<T>(this.overviewKey(tenantId, siteUrl));
  }

  private overviewKey(tenantId?: string | null, siteUrl?: string | null): string {
    const tenant = tenantId || '';
    const site = siteUrl && siteUrl !== 'All' ? siteUrl : '';
    return this.swr.key('analytics:overview', { tenant, site });
  }

  private overviewUrl(tenantId?: string | null, siteUrl?: string | null): string {
    const tenant = tenantId || '';
    const site = siteUrl && siteUrl !== 'All' ? siteUrl : '';
    let url = API_ENDPOINTS.ANALYTICS.OVERVIEW;
    const params: string[] = [];
    if (tenant) params.push(`tenant_id=${tenant}`);
    if (site) params.push(`site_url=${encodeURIComponent(site)}`);
    if (params.length) url += `?${params.join('&')}`;
    return url;
  }

  /** Drop overview/tenant entries after mutations or tenant switch cleanup. */
  invalidateOverview(tenantId?: string | null): void {
    if (tenantId) {
      this.swr.invalidate(`scope:tenant:${tenantId}`);
    }
    this.swr.invalidate('analytics:overview');
  }

  invalidateTenants(): void {
    this.swr.invalidate('analytics:tenants');
  }
}
