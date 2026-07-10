import { mergeTests } from '@playwright/test'
import { authUsers, expect } from '../fixtures/auth-users'
import { QueuePage } from '../pages/queue.page'
import { waitForEmptyQueue } from '../fixtures/wait-for-empty-queue'

const test = mergeTests(authUsers, waitForEmptyQueue)

test('gamemode selector switches queues and shows live occupancy @multi', async ({
  page,
  users,
}) => {
  const observer = new QueuePage(page)
  await observer.goto()

  await expect(observer.gamemodeCard('6v6')).toHaveAttribute('aria-selected', 'true')
  await expect(observer.gamemodeCard('9v9')).toHaveAttribute('aria-selected', 'false')
  await expect(observer.header()).toContainText('0/12')

  const p1 = await users.getNext().queuePage()
  await p1.goto()
  await p1.gamemodeCard('9v9').click()
  await expect(p1.page).toHaveURL(/\/9v9$/)
  await expect(p1.gamemodeCard('9v9')).toHaveAttribute('aria-selected', 'true')
  await expect(p1.header()).toContainText('0/18')

  await p1.joinQueue('scout-1')
  await expect(p1.header()).toContainText('1/18')
  await expect(p1.page).toHaveTitle(/\[1\/18\]/)

  // the observer on the 6v6 page sees the 9v9 card fill up, own queue untouched
  await expect(observer.gamemodeCard('9v9')).toContainText('1/18')
  await expect(observer.header()).toContainText('0/12')

  await p1.leaveQueue()
  await expect(observer.gamemodeCard('9v9')).toContainText('0/18')
  await expect(p1.header()).toContainText('0/18')
})
