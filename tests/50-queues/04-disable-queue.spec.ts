import { expect, queues } from '../fixtures/queues'
import { AdminQueuesPage } from '../pages/admin-queues.page'

queues('disabling a queue kicks its players @multi-queue', async ({ queues, users }) => {
  const { slug } = await queues.create({ template: 'auto-ultiduo', enable: true })
  const admin = new AdminQueuesPage(await users.getAdmin().page())
  await admin.moveToTop(slug)

  const player = await users.byName('BellBoy').queuePage()
  await player.goto()
  await player.slot('soldier-1').join()
  await admin.goto()
  await expect(admin.row(slug)).toContainText('1/4')

  await admin.disable(slug)
  await admin.expectFlash(`Queue ${slug} disabled`)
  await expect(admin.row(slug)).toContainText('0/4')

  await player.goto()
  await expect(player.page.getByLabel(/^Queue slot /)).not.toHaveCount(4)
  await expect(player.page.getByRole('button', { name: 'Leave queue' })).toHaveCount(0)
})
