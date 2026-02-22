import { expect, mergeTests } from '@playwright/test'
import { authUsers } from '../fixtures/auth-users'
import { waitForEmptyQueue } from '../fixtures/wait-for-empty-queue'

const test = mergeTests(authUsers, waitForEmptyQueue)

const moonManSteamId = '76561199195972852'

test.describe('when player verification is required @6v6 @9v9', () => {
  test.beforeAll(async ({ users }) => {
    const admin = await users.getAdmin().adminPage()
    await admin.configureRequirePlayerVerification(true)
  })

  test.afterAll(async ({ users }) => {
    const admin = await users.getAdmin().adminPage()
    await admin.setPlayerVerified(moonManSteamId, false)
    await admin.configureRequirePlayerVerification(false)
  })

  test('unverified player cannot join the queue', async ({ users }) => {
    const page = await users.byName('MoonMan').queuePage()
    await page.goto()

    await expect(page.slot('scout-1').joinButton()).toBeDisabled()
    await expect(page.slot('soldier-1').joinButton()).toBeDisabled()
    await expect(page.slot('demoman-1').joinButton()).toBeDisabled()
    await expect(page.slot('medic-1').joinButton()).toBeDisabled()
  })

  test.describe('and the player is verified', () => {
    test.beforeEach(async ({ users }) => {
      const admin = await users.getAdmin().adminPage()
      await admin.setPlayerVerified(moonManSteamId, true)
    })

    test.afterEach(async ({ users }) => {
      const admin = await users.getAdmin().adminPage()
      await admin.setPlayerVerified(moonManSteamId, false)
    })

    test('verified player can join the queue', async ({ users }) => {
      const page = await users.byName('MoonMan').queuePage()
      await page.goto()

      await expect(page.slot('scout-1').joinButton()).not.toBeDisabled()
      await expect(page.slot('soldier-1').joinButton()).not.toBeDisabled()
      await expect(page.slot('demoman-1').joinButton()).not.toBeDisabled()
      await expect(page.slot('medic-1').joinButton()).not.toBeDisabled()

      await page.joinQueue('scout-1')
      await expect(page.slot('scout-1').joinButton()).not.toBeVisible()
    })
  })
})

test.describe('when player verification is not required @6v6 @9v9', () => {
  test('unverified player can join the queue freely', async ({ users }) => {
    const page = await users.byName('MoonMan').queuePage()
    await page.goto()

    await expect(page.slot('scout-1').joinButton()).not.toBeDisabled()
    await expect(page.slot('soldier-1').joinButton()).not.toBeDisabled()
    await expect(page.slot('demoman-1').joinButton()).not.toBeDisabled()
    await expect(page.slot('medic-1').joinButton()).not.toBeDisabled()
  })
})
