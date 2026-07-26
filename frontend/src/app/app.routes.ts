import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { rootGuard } from './guards/root.guard';

/**
 * All feature pages use loadComponent (route-level code splitting).
 * data.preload drives CriticalPathPreloadingStrategy:
 * - guest/true → idle prefetch for everyone
 * - auth → idle prefetch after sign-in
 */
export const routes: Routes = [
  {
    path: '',
    canActivate: [rootGuard],
    loadComponent: () => import('./pages/product-home/product-home').then(m => m.ProductHome),
  },
  {
    path: 'login',
    data: { preload: 'guest' },
    loadComponent: () => import('./pages/login/login').then(m => m.Login),
  },
  {
    path: 'status',
    data: { preload: 'guest' },
    loadComponent: () => import('./pages/status/status').then(m => m.Status),
  },
  {
    path: 'status/:slug',
    loadComponent: () =>
      import('./pages/isolated-status/isolated-status').then(m => m.IsolatedStatus),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    data: { preload: 'auth' },
    loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.Dashboard),
  },
  { path: 'home', redirectTo: '', pathMatch: 'full' },
  {
    path: 'explore',
    data: { preload: 'guest' },
    loadComponent: () => import('./pages/explore/explore').then(m => m.Explore),
  },
  {
    path: 'vulnerabilities',
    canActivate: [authGuard],
    data: { preload: 'auth' },
    loadComponent: () =>
      import('./pages/vulnerabilities/vulnerabilities').then(m => m.Vulnerabilities),
  },
  {
    path: 'analytics',
    canActivate: [authGuard],
    data: { preload: 'auth' },
    loadComponent: () => import('./pages/analytics/analytics').then(m => m.AnalyticsComponent),
  },
  {
    path: 'settings',
    canActivate: [authGuard],
    data: { preload: 'auth' },
    loadComponent: () => import('./pages/settings/settings').then(m => m.Settings),
  },
  {
    path: 'account',
    canActivate: [authGuard],
    data: { preload: 'auth' },
    loadComponent: () => import('./pages/account/account').then(m => m.Account),
  },
  {
    path: 'pipeline',
    canActivate: [authGuard],
    data: { preload: 'auth' },
    loadComponent: () => import('./pages/pipeline/pipeline').then(m => m.Pipeline),
  },
  {
    path: 'success',
    loadComponent: () => import('./pages/success/success').then(m => m.Success),
  },
  {
    path: 'auth-status',
    loadComponent: () => import('./pages/auth-status/auth-status').then(m => m.AuthStatus),
  },
  {
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found').then(m => m.NotFound),
  },
];
