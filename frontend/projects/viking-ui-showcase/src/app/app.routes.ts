import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./showcase/showcase').then(m => m.Showcase),
  },
  { path: '**', redirectTo: '' },
];
