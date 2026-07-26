import { TestBed } from '@angular/core/testing';
import { provideRouter, Routes } from '@angular/router';
import { of } from 'rxjs';
import { RoutePrefetchService } from './route-prefetch.service';
import { AnalyticsQueryService } from '../services/analytics-query.service';
import { MonitorService } from '../services/monitor.service';
import { VulnerabilityService } from '../services/vulnerability.service';

describe('RoutePrefetchService', () => {
  it('invokes loadComponent once per path', async () => {
    let calls = 0;
    const routes: Routes = [
      {
        path: 'analytics',
        loadComponent: () => {
          calls += 1;
          return Promise.resolve(class Stub {});
        },
      },
    ];

    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        RoutePrefetchService,
        {
          provide: AnalyticsQueryService,
          useValue: {
            getTenants: () => of({ status: 'success', data: [] }),
            getOverview: () => of({ status: 'success', data: {} }),
          },
        },
        {
          provide: MonitorService,
          useValue: { getStatusPages: () => of([]) },
        },
        {
          provide: VulnerabilityService,
          useValue: {
            fetchVulnerabilities: () => undefined,
            fetchIncidents: () => undefined,
            fetchPlaybooks: () => undefined,
          },
        },
      ],
    });
    const prefetch = TestBed.inject(RoutePrefetchService);

    prefetch.prefetch('/analytics');
    prefetch.prefetch('analytics');
    await Promise.resolve();
    await Promise.resolve();

    expect(calls).toBe(1);
  });
});
