import { mergeTests } from '@playwright/test'
import { authUsers, expect } from '../fixtures/auth-users'
import { waitForEmptyQueue } from '../fixtures/wait-for-empty-queue'

const test = mergeTests(authUsers, waitForEmptyQueue)
test('banned player gets kicked from the queue', async ({ users }) => {
  const playerPage = await users.byName('AstraGirl').queuePage()
  await playerPage.goto()
  await playerPage.joinQueue(0)

  const adminPage = await users.getAdmin().adminPage()
  await adminPage.banPlayer(users.byName('AstraGirl').steamId, { reason: 'test' })

  await expect(playerPage.slot(0).joinButton()).toBeDisabled()

  await adminPage.revokeAllBans(users.byName('AstraGirl').steamId)
  await expect(playerPage.slot(0).joinButton()).toBeEnabled()
})
