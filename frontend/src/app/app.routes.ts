import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'status', loadComponent: () => import('./pages/status/status').then(m => m.Status) },
  {
    path: 'status/:slug',
    loadComponent: () =>
      import('./pages/isolated-status/isolated-status').then(m => m.IsolatedStatus),
  },
  { path: 'explore', loadComponent: () => import('./pages/explore/explore').then(m => m.Explore) },
  {
    path: 'vulnerabilities',
    loadComponent: () =>
      import('./pages/vulnerabilities/vulnerabilities').then(m => m.Vulnerabilities),
  },
  {
    path: 'analytics',
    loadComponent: () => import('./pages/analytics/analytics').then(m => m.AnalyticsComponent),
  },
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings/settings').then(m => m.Settings),
  },

  { path: 'login', loadComponent: () => import('./pages/login/login').then(m => m.Login) },
  { path: 'success', loadComponent: () => import('./pages/success/success').then(m => m.Success) },
  { path: '**', loadComponent: () => import('./pages/not-found/not-found').then(m => m.NotFound) },
];
