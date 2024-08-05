import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'
import type { AuthUsersOptions } from './tests/fixtures/auth-users'
import { users } from './tests/data'
import { minutesToMilliseconds } from 'date-fns'

dotenv.config()

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig<AuthUsersOptions>({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['dot'], ['github']] : 'html',
  reportSlowTests: {
    max: 5,
    threshold: minutesToMilliseconds(2),
  },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    video: {
      mode: 'retain-on-failure',
      size: { width: 1280, height: 720 },
    },
  },

  projects: [
    {
      name: 'setup database',
      testMatch: /database\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], steamIds: users.map(u => u.steamId) },
      dependencies: ['setup database'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], steamIds: users.map(u => u.steamId) },
      dependencies: ['setup database'],
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
  webServer: {
    command: 'pnpm dev',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
  },
})
