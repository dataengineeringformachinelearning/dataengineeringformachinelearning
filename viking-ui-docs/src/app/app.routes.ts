import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./shell/doc-shell').then(m => m.DocShell),
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/landing/landing').then(m => m.Landing),
      },
      {
        path: 'components',
        loadComponent: () => import('./showcase/showcase').then(m => m.Showcase),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
