import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:8000';

export default defineConfig({
  testDir: './tests/e2e',
  // No global setup - skip authentication
  timeout: 120_000,
  expect: { timeout: 15_000 },
  retries: 0,
  use: {
    baseURL,
    // Use existing storage state if available
    storageState: 'playwright/.auth/user.json',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
