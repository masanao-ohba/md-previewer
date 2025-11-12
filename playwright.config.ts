import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E testing
 *
 * Configuration requirements for modal zoom E2E tests:
 * - Headless mode for CI/CD
 * - Screenshots on failure for diagnostics
 * - JUnit XML reporter for CI integration
 * - Trace retention on failure for debugging
 * - 30 second timeout per test
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Multiple reporters for different purposes
  reporter: [
    ['html'], // Human-readable HTML report for local viewing
    ['junit', { outputFile: 'test-results/junit.xml' }], // JUnit XML for CI/CD integration
    ['list'] // Console output with test progress
  ],

  // Timeout configuration
  timeout: 30000, // 30 seconds max per test

  use: {
    // Headless mode required for CI/CD
    headless: true,

    // Screenshot configuration
    screenshot: 'only-on-failure',

    // Trace configuration for debugging failures
    trace: 'retain-on-failure',

    // Video recording (optional, helps with debugging)
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: undefined,
});
