import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'privacy',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'terms',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'whitepaper',
    renderMode: RenderMode.Prerender,
  },
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
    path: 'settings',
    renderMode: RenderMode.Client,
  },
  {
    path: 'vulnerabilities',
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
    path: 'compliance',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];
