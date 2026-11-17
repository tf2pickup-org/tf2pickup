import { expect, queues } from '../fixtures/queues'
import { AdminQueuesPage } from '../pages/admin-queues.page'
import { defaultQueueSlug } from '../queue-slots'

queues('creates a 6v6 captain queue @multi-queue', async ({ queues, users }) => {
  const { slug } = await queues.create({ template: 'auto-6v6', launchMode: 'captain' })
  const page = await users.getAdmin().page()
  const admin = new AdminQueuesPage(page)

  await admin.goto()
  await expect(admin.row(slug)).toContainText('captain')

  await page.goto(`/admin/queues/${slug}`)
  await expect(page.getByText('Launch mode')).toBeVisible()
  await expect(page.getByLabel('Pick timeout (seconds)')).toHaveValue('10')
  await expect(page.getByLabel('Player skill threshold', { exact: true })).toHaveCount(0)
})

queues(
  'refuses a captain queue for ultiduo, even from a crafted POST @multi-queue',
  async ({ users }) => {
    const page = await users.getAdmin().page()
    await page.request.post('/admin/queues', {
      form: {
        template: '',
        slug: 'e2e-captain-duo',
        name: 'x',
        gamemode: 'ultiduo',
        launchMode: 'captain',
      },
    })
    const admin = new AdminQueuesPage(page)
    await admin.goto()
    await expect(admin.row('e2e-captain-duo')).toHaveCount(0)
  },
)

queues(
  'a captain queue page has no Clear queue and leaves the auto queue alone @multi-queue',
  async ({ queues, users }) => {
    const auto = await users.byName('Polemic').page()
    await auto.goto(`/q/${defaultQueueSlug()}`)
    await expect(auto.locator('#queue')).toBeVisible()
    const before = await auto.locator('#queue').innerHTML()

    const { slug } = await queues.create({
      template: 'auto-6v6',
      launchMode: 'captain',
      enable: true,
    })
    const admin = await users.getAdmin().page()
    await admin.goto(`/q/${slug}`)
    await expect(admin.getByText('Captains 0/2')).toBeVisible()
    await expect(admin.getByRole('button', { name: 'Clear queue' })).toHaveCount(0)
    await expect(admin.getByLabel(/^Queue slot /)).toHaveCount(0)

    await auto.reload()
    expect(await auto.locator('#queue').innerHTML()).toBe(before)
    await expect(auto.getByLabel(/^Queue slot /)).toHaveCount(12)
  },
)
