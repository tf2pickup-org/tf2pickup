import { mergeTests } from '@playwright/test'
import { authUsers, expect } from '../fixtures/auth-users'
import type { QueuePage } from '../pages/queue.page'
import { waitForEmptyQueue } from '../fixtures/wait-for-empty-queue'

const test = mergeTests(authUsers, waitForEmptyQueue)

test('mark as friend', async ({ users }) => {
  const [medic1, medic2, soldier] = (await Promise.all(
    users.getMany(3).map(async user => {
      const page = await user.queuePage()
      await page.goto()
      return page
    }),
  )) as [QueuePage, QueuePage, QueuePage]
  await medic1.slot(10).join()
  await medic2.slot(11).join()
  await soldier.slot(4).join()

  await expect(soldier.slot(10).markAsFriendButton()).not.toBeVisible()

  const markAsFriendBtn1Medic1 = medic1.slot(4).markAsFriendButton()
  await expect(markAsFriendBtn1Medic1).toBeVisible()
  await expect(markAsFriendBtn1Medic1).toBeEnabled()
  await markAsFriendBtn1Medic1.check({ force: true })
  await expect(markAsFriendBtn1Medic1).toBeChecked()

  const markAsFriendBtn1Medic2 = medic2.slot(4).markAsFriendButton()
  await expect(markAsFriendBtn1Medic2).toBeVisible()
  await expect(markAsFriendBtn1Medic2).toBeDisabled()

  await medic1.leaveQueue()
  await expect(markAsFriendBtn1Medic2).toBeVisible()
  await expect(markAsFriendBtn1Medic2).toBeEnabled()

  await medic2.leaveQueue()
  await soldier.leaveQueue()
})
