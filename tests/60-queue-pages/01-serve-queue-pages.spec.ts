import { expect, queues } from '../fixtures/queues'
import { defaultQueueSlug } from '../queue-slots'

const defaultQueuePath = () => `/q/${defaultQueueSlug()}`

queues('a queue is served at /q/<slug> @multi-queue', async ({ page }) => {
  const response = await page.goto(defaultQueuePath())
  expect(response?.status()).toBe(200)
  await expect(page.getByLabel('Queue slot scout-1')).toBeVisible()
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', /\/$/)
})

queues('an unknown queue is not found @multi-queue', async ({ page }) => {
  const response = await page.goto('/q/no-such-queue')
  expect(response?.status()).toBe(404)
})

queues('a disabled queue sends you to / @multi-queue', async ({ queues, page }) => {
  const { slug } = await queues.create({ template: 'auto-ultiduo' })
  await page.goto(`/q/${slug}`)
  await expect(page).toHaveURL(defaultQueuePath())
  await expect(page.getByText('queue is not available right now')).toBeVisible()
})

queues('/ serves the default queue under its own URL @multi-queue', async ({ page }) => {
  const response = await page.goto('/')
  expect(response?.status()).toBe(200)
  expect(response?.request().redirectedFrom()).toBeNull()
  await expect(page).toHaveURL(defaultQueuePath())
  await expect(page.getByLabel('Queue slot scout-1')).toBeVisible()
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', /\/$/)
})

queues('other queues are their own canonical page @multi-queue', async ({ queues, page }) => {
  const { slug } = await queues.create({ template: 'auto-ultiduo', enable: true })
  await page.goto(`/q/${slug}`)
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute(
    'href',
    new RegExp(`/q/${slug}$`),
  )
})

queues(
  'following a link to / keeps the page and shows the queue URL @multi-queue',
  async ({ page }) => {
    await page.goto('/players')
    await page.evaluate(() => {
      ;(window as unknown as { marker: string }).marker = 'kept'
    })
    await page.getByRole('link', { name: /logo/ }).click()
    await expect(page).toHaveURL(defaultQueuePath())
    await expect(page.getByLabel('Queue slot scout-1')).toBeVisible()
    expect(await page.evaluate(() => (window as unknown as { marker?: string }).marker)).toBe(
      'kept',
    )
  },
)

queues('a page opened at / gets live updates @multi-queue', async ({ users }) => {
  const watcher = await users.byName('Polemic').queuePage()
  await watcher.page.goto('/')
  await expect(watcher.page).toHaveURL(defaultQueuePath())

  const player = await users.byName('Shadowhunter').queuePage(defaultQueueSlug())
  await player.goto()
  await player.slot('soldier-1').join()
  await expect(watcher.slot('soldier-1').locator).toHaveAttribute('data-player')
  await player.leaveQueue()
  await expect(watcher.slot('soldier-1').locator).not.toHaveAttribute('data-player')
})
