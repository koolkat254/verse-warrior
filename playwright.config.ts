import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173/verse-warrior/',
    trace: 'retain-on-failure',
    timezoneId: 'America/Chicago',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-webkit', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'npm run build:e2e && npm run preview:e2e',
    url: 'http://127.0.0.1:4173/verse-warrior/',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
