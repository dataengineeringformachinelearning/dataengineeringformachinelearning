import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

import { rootGuard } from './guards/root.guard';

export const routes: Routes = [
  {
    path: '',
    canActivate: [rootGuard],
    loadComponent: () => import('./pages/login/login').then(m => m.Login),
  },
  { path: 'status', loadComponent: () => import('./pages/status/status').then(m => m.Status) },
  {
    path: 'status/:slug',
    loadComponent: () =>
      import('./pages/isolated-status/isolated-status').then(m => m.IsolatedStatus),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.Dashboard),
  },
  { path: 'home', loadComponent: () => import('./pages/landing/landing').then(m => m.Landing) },
  { path: 'explore', loadComponent: () => import('./pages/explore/explore').then(m => m.Explore) },
  {
    path: 'vulnerabilities',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/vulnerabilities/vulnerabilities').then(m => m.Vulnerabilities),
  },
  {
    path: 'analytics',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/analytics/analytics').then(m => m.AnalyticsComponent),
  },
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings/settings').then(m => m.Settings),
  },
  {
    path: 'account',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/account/account').then(m => m.Account),
  },

  { path: 'login', loadComponent: () => import('./pages/login/login').then(m => m.Login) },
  { path: 'success', loadComponent: () => import('./pages/success/success').then(m => m.Success) },
  {
    path: 'auth-status',
    loadComponent: () => import('./pages/auth-status/auth-status').then(m => m.AuthStatus),
  },
  { path: '**', loadComponent: () => import('./pages/not-found/not-found').then(m => m.NotFound) },
];
