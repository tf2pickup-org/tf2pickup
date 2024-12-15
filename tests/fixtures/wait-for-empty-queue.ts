import test from '@playwright/test'
import { QueuePage } from '../pages/queue.page'

export const waitForEmptyQueue = test.extend<{ queueIsEmpty: void }>({
  queueIsEmpty: [
    async ({ page }, use) => {
      const q = new QueuePage(page)
      await q.goto()
      await q.waitToBeEmpty()
      await use()
    },
    { auto: true },
  ],
})
