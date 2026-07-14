import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
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
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
      },
    },
  },
  plugins: [
    {
      name: 'mock-angular-resources',
      transform(code, id) {
        if (id.endsWith('.ts')) {
          let newCode = code;
          // Replace templateUrl: './foo.html' with template: ''
          newCode = newCode.replace(/templateUrl\s*:\s*['"`](.*?)['"`]/g, "template: ''");
          // Replace styleUrl: './foo.scss' with styles: []
          newCode = newCode.replace(/styleUrl\s*:\s*['"`](.*?)['"`]/g, 'styles: []');
          newCode = newCode.replace(/styleUrls\s*:\s*\[([\s\S]*?)\]/g, 'styles: []');
          return { code: newCode };
        }
        if (
          id.endsWith('.html') ||
          id.endsWith('.scss') ||
          id.endsWith('.css') ||
          id.endsWith('.md')
        ) {
          return { code: 'export default ""' };
        }
      },
    },
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
  },
});
