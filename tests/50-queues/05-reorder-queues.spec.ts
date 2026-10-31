import { expect, queues } from '../fixtures/queues'
import { AdminQueuesPage } from '../pages/admin-queues.page'
import { defaultQueueSlug } from '../queue-slots'

queues('the first enabled queue is served at / @multi-queue', async ({ queues, users, page }) => {
  const { slug } = await queues.create({ template: 'auto-ultiduo', enable: true })
  const admin = new AdminQueuesPage(await users.getAdmin().page())

  await admin.moveToTop(slug)
  await page.goto('/')
  await expect(page.getByLabel(/^Queue slot /)).toHaveCount(4)
  for (const slot of ['soldier-1', 'soldier-2', 'medic-1', 'medic-2']) {
    await expect(page.getByLabel(`Queue slot ${slot}`)).toBeVisible()
  }

  await admin.move(slug, 'down')
  await admin.goto()
  await expect(admin.page.getByRole('row').nth(1)).toHaveAccessibleName(
    `Queue ${defaultQueueSlug()}`,
  )
  await page.goto('/')
  await expect(page.getByLabel(/^Queue slot /)).not.toHaveCount(4)
})
