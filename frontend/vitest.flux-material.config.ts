import angular from '@analogjs/vite-plugin-angular';
import { defineConfig } from 'vitest/config';

// Dedicated config for the @deml/flux-material library. Unlike the app config
// (which stubs component templates), the library tests compile real templates
// via the Analog Angular plugin so signal-based inputs/models work under test.
export default defineConfig({
  plugins: [angular({ tsconfig: './projects/flux-material/tsconfig.spec.json' })],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['projects/flux-material/src/**/*.spec.ts'],
  },
});
