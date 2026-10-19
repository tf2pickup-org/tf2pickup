import { expect, queues } from '../fixtures/queues'
import { AdminQueuesPage } from '../pages/admin-queues.page'
import { defaultQueueSlug } from '../queue-slots'

queues('rejects a duplicate slug @multi-queue', async ({ users }) => {
  const admin = new AdminQueuesPage(await users.getAdmin().page())
  await admin.create({ slug: defaultQueueSlug(), name: 'duplicate', template: 'auto-9v9' })
  await admin.expectFlash(`queue ${defaultQueueSlug()} already exists`)
})

queues('rejects an invalid slug sent past the form @multi-queue', async ({ users }) => {
  const page = await users.getAdmin().page()
  await page.request.post('/admin/queues', {
    form: { template: '', slug: 'Not A Slug', name: 'x', gamemode: '6v6' },
  })
  const admin = new AdminQueuesPage(page)
  await admin.goto()
  await expect(admin.row('Not A Slug')).toHaveCount(0)
})

queues('rejects an empty name @multi-queue', async ({ users }) => {
  const page = await users.getAdmin().page()
  await page.request.post('/admin/queues', {
    form: { template: '', slug: 'e2e-empty-name', name: '  ', gamemode: '6v6' },
  })
  const admin = new AdminQueuesPage(page)
  await admin.goto()
  await expect(admin.row('e2e-empty-name')).toHaveCount(0)
})

queues(
  'does not change the slug or gamemode of an existing queue @multi-queue',
  async ({ queues, users }) => {
    const { slug } = await queues.create({ template: 'auto-ultiduo' })
    const page = await users.getAdmin().page()
    await page.request.post(`/admin/queues/${slug}`, {
      form: {
        name: 'renamed',
        slug: 'hijacked',
        gamemode: 'bball',
        readyUpTimeout: '40',
        readyStateTimeout: '60',
        mapCooldown: '2',
      },
    })

    const admin = new AdminQueuesPage(page)
    await admin.goto()
    await expect(admin.row(slug)).toContainText('renamed')
    await expect(admin.row(slug)).toContainText('ultiduo')
    await expect(admin.row('hijacked')).toHaveCount(0)
  },
)
