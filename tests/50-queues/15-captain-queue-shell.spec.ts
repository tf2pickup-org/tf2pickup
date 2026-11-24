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
  await expect(page.getByText('6v6 · captain')).toBeVisible()
  await expect(page.getByLabel('Player skill threshold', { exact: true })).toHaveCount(0)

  await page.goto(`/admin/queues/${slug}/timers`)
  await expect(page.getByLabel('Pick timeout', { exact: true })).toHaveValue('10')
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
  'a captain queue page has no Clear queue and ignores the auto queue @multi-queue',
  async ({ queues, users }) => {
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

    const content = () => admin.locator('#queue-content').innerHTML()
    const dto = async () => (await admin.request.get(`/api/v1/queues/${slug}`)).json() as unknown
    const htmlBefore = await content()
    const dtoBefore = await dto()
    expect(dtoBefore).toMatchObject({ launchMode: 'captain', slots: [], mapVoteResults: {} })

    const player = await users.byName('Shadowhunter').queuePage(defaultQueueSlug())
    await player.goto()
    await player.joinQueue('medic-1')
    await player.leaveQueue()

    expect(await dto()).toEqual(dtoBefore)
    expect(await content()).toBe(htmlBefore)
  },
)
