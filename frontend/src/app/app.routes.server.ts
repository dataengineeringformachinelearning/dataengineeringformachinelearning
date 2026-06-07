import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'status',
    renderMode: RenderMode.Client,
  },
  {
    path: 'status/:slug',
    renderMode: RenderMode.Client,
  },
  {
    path: 'explore',
    renderMode: RenderMode.Client,
  },
  {
    path: 'manage',
    renderMode: RenderMode.Client,
  },
  {
    path: 'documentation',
    renderMode: RenderMode.Client,
  },
  {
    path: 'book',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
