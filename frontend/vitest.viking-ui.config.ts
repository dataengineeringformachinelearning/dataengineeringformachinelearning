import angular from '@analogjs/vite-plugin-angular';
import { defineConfig } from 'vitest/config';

// Keep Viking-UI's source tests isolated with their own TypeScript program while
// compiling the same real Angular templates used by the application tests.
export default defineConfig({
  plugins: [angular({ tsconfig: '../packages/viking-ui/tsconfig.spec.json' })],
  resolve: {
    dedupe: [
      '@angular/common',
      '@angular/compiler',
      '@angular/core',
      '@angular/forms',
      '@angular/platform-browser',
      '@angular/router',
    ],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['../packages/viking-ui/src/**/*.spec.ts'],
  },
});
