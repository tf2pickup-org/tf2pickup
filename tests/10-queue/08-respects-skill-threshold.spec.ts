import { expect, mergeTests } from '@playwright/test'
import { authUsers } from '../fixtures/auth-users'
import { waitForEmptyQueue } from '../fixtures/wait-for-empty-queue'

const test = mergeTests(authUsers, waitForEmptyQueue)

test.describe('when player skill threshold is set', () => {
  test.beforeAll(async ({ users }) => {
    const admin = await users.getAdmin().adminPage()
    await admin.configurePlayerSkillThreshold(2)
  })

  test.afterAll(async ({ users }) => {
    const admin = await users.getAdmin().adminPage()
    await admin.configurePlayerSkillThreshold(null)
  })

  test.describe('and player does not meet the threshold on the given class', () => {
    test.beforeEach(async ({ users }) => {
      const admin = await users.getAdmin().adminPage()
      await admin.updateSkill(users.byName('MoonMan').steamId, {
        scout: 1,
        soldier: 3,
        demoman: 3,
        medic: 4,
      })
    })

    test('should not allow players to join queue on restricted classes', async ({ users }) => {
      const page = await users.byName('MoonMan').queuePage()
      await page.goto()

      // scout slots are disabled
      await expect(page.slot('scout-1').joinButton()).toBeDisabled()
      await expect(page.slot('scout-2').joinButton()).toBeDisabled()
      await expect(page.slot('scout-3').joinButton()).toBeDisabled()
      await expect(page.slot('scout-4').joinButton()).toBeDisabled()

      // other slots are enabled
      await expect(page.slot('soldier-1').joinButton()).not.toBeDisabled()
      await expect(page.slot('soldier-2').joinButton()).not.toBeDisabled()
      await expect(page.slot('soldier-3').joinButton()).not.toBeDisabled()
      await expect(page.slot('soldier-4').joinButton()).not.toBeDisabled()
      await expect(page.slot('demoman-1').joinButton()).not.toBeDisabled()
      await expect(page.slot('demoman-2').joinButton()).not.toBeDisabled()
      await expect(page.slot('medic-1').joinButton()).not.toBeDisabled()
      await expect(page.slot('medic-2').joinButton()).not.toBeDisabled()
    })
  })
})
