import { authUsers, expect } from '../fixtures/auth-users'
import { QueuePage } from '../pages/queue.page'

authUsers('update player count', async ({ page, users }) => {
  const queuePage = new QueuePage(page)
  await queuePage.goto()

  const p1 = await users.getNext().queuePage()
  const p2 = await users.getNext().queuePage()

  await expect(queuePage.header()).toContainText('0/12')
  await expect(queuePage.page).toHaveTitle(/\[0\/12\]/)
  await p1.joinQueue(0)
  await expect(queuePage.header()).toContainText('1/12')
  await expect(queuePage.page).toHaveTitle(/\[1\/12\]/)
  await p2.joinQueue(1)
  await expect(queuePage.header()).toContainText('2/12')
  await expect(queuePage.page).toHaveTitle(/\[2\/12\]/)

  await p1.leaveQueue()
  await expect(queuePage.header()).toContainText('1/12')
  await expect(queuePage.page).toHaveTitle(/\[1\/12\]/)
  await p2.leaveQueue()
  await expect(queuePage.header()).toContainText('0/12')
  await expect(queuePage.page).toHaveTitle(/\[0\/12\]/)
})
