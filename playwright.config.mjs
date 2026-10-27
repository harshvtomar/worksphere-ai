import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false, workers: 1, retries: 0,
  timeout: 120000,
  expect: { timeout: 15000 },
  reporter: [['list'], ['html', { outputFolder: 'browser-report', open: 'never' }]],
  outputDir: 'browser-results',
  use: { baseURL: 'http://127.0.0.1:3000', browserName: 'chromium', screenshot: 'only-on-failure', trace: 'off' },
});
