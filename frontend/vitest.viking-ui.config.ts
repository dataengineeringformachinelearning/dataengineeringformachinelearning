import angular from '@analogjs/vite-plugin-angular';
import { defineConfig } from 'vitest/config';

// Dedicated config for the @deml/viking-ui library. Unlike the app config
// (which stubs component templates), the library tests compile real templates
// via the Analog Angular plugin so signal-based inputs/models work under test.
export default defineConfig({
  plugins: [angular({ tsconfig: './projects/viking-ui/tsconfig.spec.json' })],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['projects/viking-ui/src/**/*.spec.ts'],
  },
});
