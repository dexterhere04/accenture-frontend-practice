const { defineConfig, devices } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './exercises', testMatch: '**/test.spec.js',
  fullyParallel: false, workers: 1, retries: 0,
  timeout: 15000, globalTimeout: 150000,
  reporter: [['json']], outputDir: './test-results/ide',
  use: { ...devices['Desktop Chrome'], baseURL: process.env.IDE_BASE_URL, headless: true, trace: 'off' },
});
