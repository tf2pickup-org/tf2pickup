import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'
import { minutesToMilliseconds, secondsToMilliseconds } from 'date-fns'

dotenv.config()

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'blob' : 'html',
  timeout: secondsToMilliseconds(45),
  reportSlowTests: {
    max: 5,
    threshold: minutesToMilliseconds(10),
  },
  use: {
    baseURL: process.env.CI ? 'https://www.localhost' : 'http://localhost:3000',
    trace: 'retain-on-failure',
  },

  projects: [
    // Setup project
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      use: { ...(process.env.CI ? { ignoreHTTPSErrors: true } : {}) },
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], ...(process.env.CI ? { ignoreHTTPSErrors: true } : {}) },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        ...(process.env.CI ? { ignoreHTTPSErrors: true } : {}),
      },
      dependencies: ['setup'],
    },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],
})
