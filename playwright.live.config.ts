import { defineConfig, devices } from '@playwright/test';

// Smoke tests of the published page. LIVE_URL is the address of the deployed site.
const live = process.env.LIVE_URL;
if (!live) throw new Error('Set LIVE_URL to the address of the published page.');

export default defineConfig({
  testDir: 'tests/live',
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-live' }]],
  use: { baseURL: live.endsWith('/') ? live : `${live}/`, trace: 'off', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  ],
});
