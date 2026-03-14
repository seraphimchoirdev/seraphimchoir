import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 4,
  reporter: [['html', { open: 'never' }]],
  timeout: 60_000,

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // --- Auth Setup (runs first) ---
    { name: 'setup', testMatch: /auth\.setup\.ts/ },

    // --- Desktop ---
    {
      name: 'desktop-chrome',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'desktop-firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },

    // --- Mobile ---
    {
      name: 'mobile-android',
      use: {
        ...devices['Galaxy S5'],
        viewport: { width: 360, height: 780 },
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-ios',
      use: {
        ...devices['iPhone 15'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },

    // --- Tablet ---
    {
      name: 'tablet-portrait',
      use: {
        ...devices['iPad (gen 7)'],
        viewport: { width: 768, height: 1024 },
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'tablet-landscape',
      use: {
        ...devices['iPad (gen 7) landscape'],
        viewport: { width: 1024, height: 768 },
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },

    // --- Z Fold ---
    {
      name: 'zfold-folded',
      use: {
        userAgent:
          'Mozilla/5.0 (Linux; Android 14; SM-F956B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
        viewport: { width: 344, height: 882 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'zfold-unfolded',
      use: {
        userAgent:
          'Mozilla/5.0 (Linux; Android 14; SM-F956B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
        viewport: { width: 882, height: 816 },
        deviceScaleFactor: 2.625,
        isMobile: true,
        hasTouch: true,
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
