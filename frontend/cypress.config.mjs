import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_baseUrl || 'http://localhost:4000',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    setupNodeEvents() {
      // Node event listeners for plugins
    },
  },
});
