import test from '@playwright/test'
import { QueuePage } from '../pages/queue.page'
import { secondsToMilliseconds } from 'date-fns'

export const waitForEmptyQueue = test.extend<{ queueIsEmpty: void }>({
  queueIsEmpty: [
    async ({ page }, use) => {
      const q = new QueuePage(page)
      await q.goto()
      await q.waitToBeEmpty({ timeout: secondsToMilliseconds(14) })
      await use()
    },
    { auto: true },
  ],
})
