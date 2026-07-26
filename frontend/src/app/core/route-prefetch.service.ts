import { Injectable, inject } from '@angular/core';
import { Route, Router } from '@angular/router';

import { AnalyticsQueryService } from '../services/analytics-query.service';
import { MonitorService } from '../services/monitor.service';
import { VulnerabilityService } from '../services/vulnerability.service';

/**
 * Imperative chunk + data prefetch for hover / intent (sidebar, CTAs).
 * Complements CriticalPathPreloadingStrategy.
 */
@Injectable({ providedIn: 'root' })
export class RoutePrefetchService {
  private readonly router = inject(Router);
  private readonly analyticsQuery = inject(AnalyticsQueryService);
  private readonly monitor = inject(MonitorService);
  private readonly vulnService = inject(VulnerabilityService);
  private readonly started = new Set<string>();
  private readonly dataWarmed = new Set<string>();
  private authDataWarmStarted = false;

  /** Prefetch the lazy chunk for a path like `/analytics` or `analytics`. */
  prefetch(path: string): void {
    const key = normalizePath(path);
    if (!key) {
      return;
    }
    this.prefetchChunk(key);
    this.warmDataForRoute(key);
  }

  /**
   * Idle-warm shared authenticated reads after login / session restore.
   * Fire-and-forget — failures are ignored.
   */
  warmAuthenticatedData(): void {
    if (this.authDataWarmStarted) {
      return;
    }
    this.authDataWarmStarted = true;
    this.scheduleIdle(() => {
      this.warmDataForRoute('dashboard');
      this.warmDataForRoute('settings');
      this.warmDataForRoute('vulnerabilities');
    });
  }

  private prefetchChunk(key: string): void {
    if (this.started.has(key)) {
      return;
    }
    const route = findLoadableRoute(this.router.config, key);
    if (!route?.loadComponent) {
      return;
    }
    this.started.add(key);
    void Promise.resolve(route.loadComponent()).catch(() => {
      this.started.delete(key);
    });
  }

  private warmDataForRoute(key: string): void {
    if (this.dataWarmed.has(key)) {
      return;
    }
    this.dataWarmed.add(key);

    const ignore = (): void => undefined;
    switch (key) {
      case 'dashboard':
      case 'analytics':
        this.analyticsQuery.getTenants<unknown>().subscribe({ next: ignore, error: ignore });
        this.analyticsQuery.getOverview<unknown>().subscribe({ next: ignore, error: ignore });
        this.monitor.getStatusPages().subscribe({ next: ignore, error: ignore });
        break;
      case 'settings':
      case 'explore':
      case 'status':
        this.monitor.getStatusPages().subscribe({ next: ignore, error: ignore });
        break;
      case 'vulnerabilities':
        this.analyticsQuery
          .getTenants<{ status?: string; data?: { id: string; is_platform?: boolean }[] }>()
          .subscribe({
            next: response => {
              const tenants = response?.data;
              const preferred =
                tenants?.find(tenant => !tenant.is_platform)?.id || tenants?.[0]?.id;
              this.vulnService.fetchVulnerabilities(preferred);
              this.vulnService.fetchIncidents(preferred);
              this.vulnService.fetchPlaybooks(preferred);
            },
            error: ignore,
          });
        break;
      default:
        break;
    }
  }

  private scheduleIdle(work: () => void): void {
    const g = globalThis as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    if (typeof g.requestIdleCallback === 'function') {
      g.requestIdleCallback(work, { timeout: 2_500 });
      return;
    }
    globalThis.setTimeout(work, 800);
  }
}

function normalizePath(path: string): string {
  return path.trim().replace(/^\//, '').split('?')[0].split('#')[0];
}

function findLoadableRoute(routes: readonly Route[], target: string, prefix = ''): Route | null {
  for (const route of routes) {
    const segment = route.path;
    if (segment === undefined || segment === '**') {
      continue;
    }
    const full = [prefix, segment].filter(p => p.length > 0).join('/');
    if (full === target && typeof route.loadComponent === 'function') {
      return route;
    }
    if (route.children?.length) {
      const nested = findLoadableRoute(route.children, target, full);
      if (nested) {
        return nested;
      }
    }
  }
  return null;
}
