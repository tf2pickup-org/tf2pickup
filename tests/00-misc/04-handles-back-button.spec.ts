import { expect, mergeTests } from '@playwright/test'
import { authUsers } from '../fixtures/auth-users'
import { waitForEmptyQueue } from '../fixtures/wait-for-empty-queue'
import { QueuePage } from '../pages/queue.page'

const test = mergeTests(authUsers, waitForEmptyQueue)

test('handle back button', async ({ page, users }) => {
  // Make sure htmx caching is disabled.

  const queuePage = new QueuePage(page)
  const player = await users.getNext().queuePage()

  await queuePage.goto()
  await player.goto()

  await queuePage.page.getByRole('link', { name: 'Games' }).click()
  await queuePage.page.waitForURL('/games')

  await player.joinQueue('scout-1')
  await queuePage.page.goBack()
  expect(await queuePage.slot('scout-1').isTaken()).toBe(true)

  await player.leaveQueue()
})
