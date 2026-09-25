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
  failOnFlakyTests: !!process.env.CI,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['blob'], ['github']] : 'html',
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
      testIgnore: /upgrade\//,
      use: { ...devices['Desktop Chrome'], ...(process.env.CI ? { ignoreHTTPSErrors: true } : {}) },
      dependencies: ['setup'],
    },
    // Upgrade test: upgrade-before runs against the previous release, then the version under test
    // starts on the same database and upgrade-after checks what survived. upgrade-after must not
    // depend on setup, which resets players.
    {
      name: 'upgrade-before',
      testMatch: /upgrade\/before\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], ...(process.env.CI ? { ignoreHTTPSErrors: true } : {}) },
      dependencies: ['setup'],
    },
    {
      name: 'upgrade-after',
      testMatch: /upgrade\/after\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], ...(process.env.CI ? { ignoreHTTPSErrors: true } : {}) },
    },
    // {
    //   name: 'firefox',
    //   use: {
    //     ...devices['Desktop Firefox'],
    //     ...(process.env.CI ? { ignoreHTTPSErrors: true } : {}),
    //   },
    //   dependencies: ['setup'],
    // },
  ],
})
