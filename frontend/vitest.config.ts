import angular from '@analogjs/vite-plugin-angular';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [angular({ tsconfig: './tsconfig.spec.json' })],
  resolve: {
    alias: {
      '@dataengineeringformachinelearning/viking-ui': path.resolve(
        __dirname,
        '../packages/viking-ui/src/public-api.ts',
      ),
    },
    dedupe: [
      '@angular/common',
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
    include: ['src/**/*.spec.ts'],
  },
});
