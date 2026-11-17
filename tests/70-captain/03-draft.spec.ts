import type { Page } from '@playwright/test'
import { minutesToMilliseconds, secondsToMilliseconds } from 'date-fns'
import { expect, queues } from '../fixtures/queues'
import { defaultQueueSlug } from '../queue-slots'
import type { UserManager } from '../user-manager'

const roles = [
  'scout:pocket',
  'scout:flank',
  'soldier:pocket',
  'soldier:roamer',
  'demoman:demoman',
  'medic:medic',
]
const test = queues

async function configure(users: UserManager, slug: string, pickTimeout: number) {
  const admin = await users.getAdmin().page()
  const response = await admin.request.post(`/admin/queues/${slug}`, {
    form: {
      name: slug,
      readyUpTimeout: '40',
      readyStateTimeout: '60',
      pickTimeout: String(pickTimeout),
      mapCooldown: '2',
    },
  })
  expect(response.ok()).toBe(true)
}

// 12 players, two per role, all pre-readied: the draft starts as soon as the pool is full.
// The first two volunteer for captain.
async function startDraft(users: UserManager, slug: string): Promise<Page[]> {
  const members = [...users].slice(0, 12)
  const pages = await Promise.all(members.map(member => member.page()))
  await Promise.all(pages.map(page => page.goto(`/q/${slug}`)))
  for (const [index, page] of pages.entries()) {
    await page.locator(`[data-role="${roles[index % roles.length]!}"] input`).check()
    const preReady = page.getByRole('button', { name: 'Pre-ready up' })
    await expect(preReady).toBeEnabled()
    if ((await preReady.getAttribute('aria-pressed')) !== 'true') {
      await preReady.click()
      await expect(preReady).toHaveAttribute('aria-pressed', 'true')
    }
    if (index < 2) {
      await page.getByLabel('Volunteer as captain').check()
    }
  }
  return pages
}

async function dto(page: Page, slug: string) {
  return (await (await page.request.get(`/api/v1/queues/${slug}`)).json()) as { state: string }
}

async function autoSnapshot(page: Page) {
  const slug = defaultQueueSlug()
  await page.goto(`/q/${slug}`)
  return {
    dto: await dto(page, slug),
    html: await page.locator('#queue').innerHTML(),
  }
}

test.describe('captain draft @multi-queue', () => {
  test.setTimeout(minutesToMilliseconds(2))

  test('two volunteers are the captains, RED picks first, and picks follow the snake order', async ({
    queues,
    users,
    page,
  }) => {
    const { slug } = await queues.create({
      template: 'auto-6v6',
      launchMode: 'captain',
      enable: true,
    })
    await configure(users, slug, 30)
    const autoBefore = await autoSnapshot(page)
    const pages = await startDraft(users, slug)

    await expect.poll(async () => (await dto(page, slug)).state).toBe('drafting')
    await expect(pages[5]!.locator('#captain-draft-status')).toContainText('(RED) is first picking')
    const [first, second] = await Promise.all(
      pages
        .slice(0, 2)
        .map(async p => ((await p.getByText('Your pick — pick 1').count()) > 0 ? p : undefined)),
    )
    const red = first ?? second!
    const other = red === pages[0] ? pages[1]! : pages[0]!

    await expect(red.locator('#captain-draft-status')).toContainText('Your pick — pick 1')
    await expect(red.locator('#captain-draft button').first()).toBeVisible()
    await expect(other.locator('#captain-draft button')).toHaveCount(0)
    await expect(pages[5]!.locator('#captain-draft button')).toHaveCount(0)

    await red.locator('#captain-draft button').first().click()
    await expect(other.locator('#captain-draft-status')).toContainText('Your pick — pick 2 & 3')
    await expect(pages[5]!.locator('#captain-draft-board')).toContainText('Pick 2')
    await expect(red.locator('#captain-draft button')).toHaveCount(0)
    expect(await autoSnapshot(page)).toEqual(autoBefore)
  })

  test('a turn that runs out picks for the captain, and the draft reaches the map bans', async ({
    queues,
    users,
    page,
  }) => {
    const { slug } = await queues.create({
      template: 'auto-6v6',
      launchMode: 'captain',
      enable: true,
    })
    await configure(users, slug, 1)
    const before = await autoSnapshot(page)
    const pages = await startDraft(users, slug)

    await expect
      .poll(async () => (await dto(page, slug)).state, { timeout: secondsToMilliseconds(60) })
      .toBe('banningMaps')
    await expect(pages[5]!.locator('#captain-draft-status')).toContainText('map bans')
    await expect(pages[5]!.locator('#captain-draft-board [aria-label^="Pick "]')).toHaveCount(0)
    expect(await autoSnapshot(page)).toEqual(before)
  })

  test('sign-up for the next game stays open during a draft', async ({ queues, users }) => {
    const { slug } = await queues.create({
      template: 'auto-6v6',
      launchMode: 'captain',
      enable: true,
    })
    await configure(users, slug, 30)
    const pages = await startDraft(users, slug)
    await expect(pages[5]!.locator('#captain-draft')).toHaveAttribute('data-active')

    const newcomer = await users.getMany(13)[12].page()
    await newcomer.goto(`/q/${slug}`)
    await newcomer.locator('[data-role="medic:medic"] input').check()
    await newcomer.getByLabel('Volunteer as captain').check()

    await expect(pages[5]!.getByText('Next game:')).toBeVisible()
    await expect(pages[5]!.getByText('Players 1/12')).toBeVisible()
    await expect(
      pages[5]!
        .locator('#captain-pool [data-role="medic:medic"]')
        .getByText(users.getMany(13)[12].playerName),
    ).toBeVisible()
    await expect(
      pages[5]!.locator('#captain-draft').getByText(users.getMany(13)[12].playerName),
    ).toHaveCount(0)
    await expect(pages[0]!.locator('#captain-pool input[type=checkbox]')).toHaveCount(0)
    await expect(newcomer.locator('#ready-up-dialog')).not.toBeVisible()
  })
})
