import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@deml/flux-material': path.resolve(__dirname, 'projects/flux-material/src/public-api.ts'),
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
