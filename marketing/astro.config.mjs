// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://dataengineeringformachinelearning.com/',
  integrations: [sitemap()],
  vite: {
    // Same names as Edge backend/frontend (FRONTEND_URL, BACKEND_URL, MARKETING_URL).
    envPrefix: ['PUBLIC_', 'FRONTEND_', 'BACKEND_', 'MARKETING_'],
  },
});
