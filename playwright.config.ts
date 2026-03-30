import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  retries: 1,
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.05, // Allow 5% pixel difference (font rendering varies)
      threshold: 0.3,
    },
  },
  use: {
    baseURL: 'http://localhost:3002',
    headless: true,
    screenshot: 'only-on-failure',
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: 'npm run dev -- --port 3002',
    port: 3002,
    reuseExistingServer: true,
    timeout: 30000,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
