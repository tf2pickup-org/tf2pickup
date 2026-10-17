import { expect, queues } from '../fixtures/queues'
import { AdminQueuesPage } from '../pages/admin-queues.page'
import { defaultQueueSlug } from '../queue-slots'

queues('cannot enable a queue with fewer than 3 maps @multi-queue', async ({ queues, users }) => {
  const { slug } = await queues.create({ gamemode: '6v6' })
  const admin = new AdminQueuesPage(await users.getAdmin().page())
  await admin.enable(slug)
  await admin.expectFlash('a queue needs at least 3 maps in its map pool')
  expect(await admin.isEnabled(slug)).toBe(false)
})

queues('cannot disable the last enabled queue @multi-queue', async ({ users }) => {
  const admin = new AdminQueuesPage(await users.getAdmin().page())
  await admin.disable(defaultQueueSlug())
  await admin.expectFlash('at least one queue must stay enabled')
  expect(await admin.isEnabled(defaultQueueSlug())).toBe(true)
})

queues('cannot delete an enabled queue @multi-queue', async ({ queues, users }) => {
  const { slug } = await queues.create({ template: 'auto-bball', enable: true })
  const page = await users.getAdmin().page()
  const admin = new AdminQueuesPage(page)
  await admin.goto()
  await expect(admin.row(slug).getByRole('button', { name: `Delete queue ${slug}` })).toBeDisabled()

  await page.request.post(`/admin/queues/${slug}/delete`)
  expect(await admin.isEnabled(slug)).toBe(true)
})
