import test from '@playwright/test'
import { QueuePage } from '../pages/queue.page'

export const queuePage = test.extend<{ queue: QueuePage }>({
  queue: async ({ page }, use) => {
    const q = new QueuePage(page)
    await q.goto()
    use(q)
  },
})
