import { defineConfig } from '@playwright/test';

// These are browser engines and simulated viewports, not physical phones or Safari.
const projects = ['chromium', 'firefox', 'webkit'].flatMap(browserName => [
  { name: `${browserName}-desktop`, use: { browserName, viewport: { width: 1440, height: 1050 } } },
  { name: `${browserName}-mobile`, use: {
    browserName, viewport: { width: 390, height: 844 }, hasTouch: true,
    isMobile: browserName !== 'firefox',
  } },
]);

export default defineConfig({
  testDir: './tests/browser',
  timeout: 60000,
  globalTimeout: 10 * 60 * 1000,
  expect: { timeout: 15000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: process.env.CI ? 2 : 3,
  outputDir: 'dist/browser-results',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'dist/browser-report', open: 'never' }],
    ['json', { outputFile: 'dist/browser-results/results.json' }],
  ],
  use: {
    acceptDownloads: true,
    launchOptions: { timeout: 45000 },
    locale: 'it-IT',
    colorScheme: 'light',
    reducedMotion: 'reduce',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects,
});
