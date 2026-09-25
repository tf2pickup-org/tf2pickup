import { mergeTests } from '@playwright/test'
import { authUsers } from './auth-users'
import { waitForEmptyQueue } from './wait-for-empty-queue'
import { AdminQueuesPage } from '../pages/admin-queues.page'

export interface QueueHandle {
  slug: string
}

interface CreateQueueOptions {
  // a preset slug; a blank queue otherwise
  template?: string
  gamemode?: string
  enable?: boolean
}

// Queues a test creates through the admin panel; disabled and deleted again when the test ends.
export const queues = mergeTests(authUsers, waitForEmptyQueue).extend<{
  queues: { create: (options?: CreateQueueOptions) => Promise<QueueHandle> }
}>({
  queues: async ({ users }, use, testInfo) => {
    const admin = new AdminQueuesPage(await users.getAdmin().page())
    const created: string[] = []

    await use({
      create: async ({ template, gamemode, enable } = {}) => {
        const slug = `e2e-${testInfo.testId
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .slice(0, 8)}-${created.length}`
        await admin.create({ slug, name: slug, template, gamemode })
        await admin.expectFlash(`Queue ${slug} added`)
        created.push(slug)
        if (enable) {
          await admin.enable(slug)
          await admin.expectFlash(`Queue ${slug} enabled`)
        }
        return { slug }
      },
    })

    for (const slug of created.reverse()) {
      if (await admin.isEnabled(slug)) {
        await admin.disable(slug)
      }
      await admin.delete(slug)
    }
  },
})

export { expect } from '@playwright/test'
