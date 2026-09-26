import type { Page } from '@playwright/test'
import { expect, queues } from '../fixtures/queues'
import { defaultQueueSlug } from '../queue-slots'

const test = queues.extend<{ ultiduo: string }>({
  ultiduo: async ({ queues }, use) => {
    const { slug } = await queues.create({ template: 'auto-ultiduo', enable: true })
    await use(slug)
  },
})

function tab(page: Page, slug: string) {
  return page.getByRole('navigation', { name: 'Queues' }).getByRole('link', { name: slug })
}

test('switching queues swaps only the queue @multi-queue', async ({ users, ultiduo }) => {
  const page = await users.byName('Polemic').page()
  await page.goto(`/q/${defaultQueueSlug()}`)
  await page.evaluate(() => {
    ;(window as unknown as { marker: string }).marker = 'kept'
  })
  await page.locator('#tab-chat').evaluate(chat => {
    chat.setAttribute('data-marker', 'kept')
  })

  const preload = page.waitForRequest(request => request.url().endsWith(`/q/${ultiduo}`))
  await tab(page, ultiduo).hover()
  await preload
  await tab(page, ultiduo).click()

  await expect(page).toHaveURL(`/q/${ultiduo}`)
  await expect(page.getByLabel(/^Queue slot /)).toHaveCount(4)
  await expect(page).toHaveTitle(/\[0\/4\]/)
  await expect(tab(page, ultiduo)).toHaveAttribute('aria-current', 'page')
  await expect(page.locator('#tab-chat')).toHaveAttribute('data-marker', 'kept')
  expect(await page.evaluate(() => (window as unknown as { marker?: string }).marker)).toBe('kept')
})

test('back and forward show the right queue, up to date @multi-queue', async ({
  users,
  ultiduo,
}) => {
  const page = await users.byName('Polemic').page()
  await page.goto(`/q/${defaultQueueSlug()}`)
  await tab(page, ultiduo).click()
  await expect(page.getByLabel(/^Queue slot /)).toHaveCount(4)

  await page.goBack()
  await expect(page).toHaveURL(`/q/${defaultQueueSlug()}`)
  await expect(page.getByLabel(/^Queue slot /)).toHaveCount(12)

  const player = await users.byName('Shadowhunter').queuePage(ultiduo)
  await player.goto()
  await player.slot('medic-1').join()

  await page.goForward()
  await expect(page).toHaveURL(`/q/${ultiduo}`)
  await expect(page.getByLabel('Queue slot medic-1')).toHaveAttribute('data-player')
  await player.leaveQueue()
})

test('each queue page gets its own updates @multi-queue', async ({ users, ultiduo }) => {
  const sixes = await users.byName('Polemic').queuePage(defaultQueueSlug())
  await sixes.goto()
  const duo = await users.byName('MoonMan').queuePage(ultiduo)
  await duo.goto()

  const player = await users.byName('Shadowhunter').queuePage(ultiduo)
  await player.goto()
  await player.slot('soldier-1').join()

  await expect(duo.slot('soldier-1').locator).toHaveAttribute('data-player')
  await expect(sixes.slot('soldier-1').locator).not.toHaveAttribute('data-player')
  await expect(tab(sixes.page, ultiduo)).toContainText('1/4')

  await player.leaveQueue()
  await expect(tab(sixes.page, ultiduo)).toContainText('0/4')
})

test('joining a queue leaves the other one @multi-queue', async ({ users, ultiduo }) => {
  const sixes = await users.byName('Polemic').queuePage(defaultQueueSlug())
  await sixes.goto()

  const player = await users.byName('Shadowhunter').queuePage(defaultQueueSlug())
  await player.goto()
  await player.slot('scout-1').join()
  await expect(sixes.slot('scout-1').locator).toHaveAttribute('data-player')

  const duo = await users.byName('Shadowhunter').queuePage(ultiduo)
  await duo.goto()
  await duo.slot('soldier-2').join()
  await expect(sixes.slot('scout-1').locator).not.toHaveAttribute('data-player')
  await duo.leaveQueue()
})

test('chat and online players reach every queue page @multi-queue', async ({ users, ultiduo }) => {
  const sixes = await users.byName('Polemic').page()
  await sixes.goto(`/q/${defaultQueueSlug()}`)
  const duo = await users.byName('MoonMan').page()
  await duo.goto(`/q/${ultiduo}`)
  await duo.getByRole('button', { name: 'Chat' }).click()
  await sixes.getByRole('button', { name: 'Chat' }).click()

  const message = `hello from 6v6 ${Date.now()}`
  await sixes.getByPlaceholder('Send message...').fill(message)
  await sixes.getByRole('button', { name: 'Send message' }).click()
  await expect(duo.getByText(message)).toBeVisible()

  await duo.locator('[data-tabs-select=tab-online-player-list]').click()
  await expect(
    duo.locator('#online-player-list').getByRole('link', { name: 'Polemic' }),
  ).toBeVisible()
})
