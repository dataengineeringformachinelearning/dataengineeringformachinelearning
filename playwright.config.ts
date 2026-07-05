import { defineConfig, devices } from '@playwright/test';

const reuseExistingServer = !process.env.CI;

export default defineConfig({
  testDir: './tests/visual',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list']],
  use: {
    ...devices['Desktop Chrome'],
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'backend-chromium',
      testMatch: /backend\.spec\.ts/,
      use: {
        baseURL: 'http://127.0.0.1:8000',
      },
    },
    {
      name: 'viking-ui-docs-chromium',
      testMatch: /viking-ui-docs\.spec\.ts/,
      use: {
        baseURL: 'http://127.0.0.1:4300',
      },
    },
  ],
  webServer: [
    {
      command: 'bash scripts/chromatic-backend-server.sh',
      url: 'http://127.0.0.1:8000',
      timeout: 180_000,
      reuseExistingServer,
    },
    {
      command: 'npm run build --prefix viking-ui-docs && npm run preview --prefix viking-ui-docs -- --host 127.0.0.1',
      url: 'http://127.0.0.1:4300',
      timeout: 240_000,
      reuseExistingServer,
    },
  ],
});
