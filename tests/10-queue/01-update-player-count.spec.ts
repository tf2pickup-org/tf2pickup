import { mergeTests } from '@playwright/test'
import { authUsers, expect } from '../fixtures/auth-users'
import { QueuePage } from '../pages/queue.page'
import { waitForEmptyQueue } from '../fixtures/wait-for-empty-queue'

const test = mergeTests(authUsers, waitForEmptyQueue)

test('update player count @6v6', async ({ page, users }) => {
  const queuePage = new QueuePage(page)
  const p1 = await users.getNext().queuePage()
  const p2 = await users.getNext().queuePage()

  await Promise.all([queuePage.goto(), p1.goto(), p2.goto()])

  await expect(queuePage.header()).toContainText('0/12')
  await expect(queuePage.page).toHaveTitle(/\[0\/12\]/)
  await p1.joinQueue('scout-1')
  await expect(queuePage.header()).toContainText('1/12')
  await expect(queuePage.page).toHaveTitle(/\[1\/12\]/)
  await p2.joinQueue('scout-2')
  await expect(queuePage.header()).toContainText('2/12')
  await expect(queuePage.page).toHaveTitle(/\[2\/12\]/)

  await p1.leaveQueue()
  await expect(queuePage.header()).toContainText('1/12')
  await expect(queuePage.page).toHaveTitle(/\[1\/12\]/)
  await p2.leaveQueue()
  await expect(queuePage.header()).toContainText('0/12')
  await expect(queuePage.page).toHaveTitle(/\[0\/12\]/)
})
