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

async function createPool(users: UserManager, slug: string, count = 12): Promise<Page[]> {
  const members = [...users].slice(0, count)
  const pages = await Promise.all(members.map(member => member.page()))
  await Promise.all(pages.map(page => page.goto(`/q/${slug}`)))
  for (const [index, page] of pages.entries()) {
    const role = index === 12 ? roles[5]! : roles[index % roles.length]!
    await page.locator(`[data-role="${role}"] input`).check()
    const preReady = page.getByRole('button', { name: 'Pre-ready up' })
    await expect(preReady).toBeEnabled()
    if ((await preReady.getAttribute('aria-pressed')) === 'true') {
      await preReady.click()
      await expect(preReady).toHaveAttribute('aria-pressed', 'false')
    }
  }
  return pages
}

async function volunteer(pages: Page[]) {
  await pages[0]!.getByLabel('Volunteer as captain').check()
  await pages[1]!.getByLabel('Volunteer as captain').check()
}

async function state(page: Page, slug: string): Promise<string> {
  const dto = (await (await page.request.get(`/api/v1/queues/${slug}`)).json()) as { state: string }
  return dto.state
}

async function configure(
  users: UserManager,
  slug: string,
  readyUpTimeout: number,
  readyStateTimeout: number,
) {
  const admin = await users.getAdmin().page()
  const response = await admin.request.post(`/admin/queues/${slug}`, {
    form: {
      name: slug,
      readyUpTimeout: String(readyUpTimeout),
      readyStateTimeout: String(readyStateTimeout),
      pickTimeout: '10',
      mapCooldown: '2',
    },
  })
  expect(response.ok()).toBe(true)
}

async function autoSnapshot(page: Page) {
  const slug = defaultQueueSlug()
  await page.goto(`/q/${slug}`)
  return {
    dto: (await (await page.request.get(`/api/v1/queues/${slug}`)).json()) as unknown,
    html: await page.locator('#queue').innerHTML(),
  }
}

test.describe('captain ready-up @multi-queue', () => {
  test.setTimeout(minutesToMilliseconds(2))

  test('honors pre-ready, readies newcomers and starts the draft without touching auto', async ({
    queues,
    users,
    page,
  }) => {
    const { slug } = await queues.create({
      template: 'auto-6v6',
      launchMode: 'captain',
      enable: true,
    })
    const autoBefore = await autoSnapshot(page)
    const pages = await createPool(users, slug)
    await pages[0]!.getByRole('button', { name: 'Pre-ready up' }).click()
    await expect(pages[0]!.getByRole('button', { name: 'Pre-ready up' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await volunteer(pages)

    await expect(pages[2]!.locator('#ready-up-dialog')).toBeVisible()
    await expect(pages[0]!.locator('#ready-up-dialog')).not.toBeVisible()
    await expect(pages[1]!.locator('#ready-up-dialog')).not.toBeVisible()
    await expect(pages[0]!.locator('#captain-ready-status')).toContainText('READY UP!')
    await expect(pages[0]!.locator('#captain-ready-status [data-phase-progress]')).toBeVisible()
    await expect(
      pages[0]!
        .locator('#captain-pool [data-player]')
        .filter({ hasText: users.getMany(12)[0].playerName })
        .first(),
    ).toHaveClass(/bg-emerald-900/)

    const newcomer = await users.getMany(13)[12].page()
    await newcomer.goto(`/q/${slug}`)
    await newcomer.locator('[data-role="medic:medic"] input').check()
    await expect(
      newcomer
        .locator('#captain-pool [data-ready="true"]')
        .filter({ hasText: users.getMany(13)[12].playerName }),
    ).toHaveCount(1)
    await expect(newcomer.locator('#ready-up-dialog')).not.toBeVisible()

    await Promise.all(
      pages
        .slice(2)
        .map(player => player.getByRole('button', { name: "I'm ready", exact: true }).click()),
    )
    await expect.poll(() => state(page, slug)).toBe('drafting')
    await expect(pages[2]!.locator('#ready-up-dialog')).not.toBeVisible()
    await expect(pages[2]!.locator('#captain-ready-status')).toBeEmpty()
    expect(await autoSnapshot(page)).toEqual(autoBefore)
  })

  test('declining ready-up returns an incomplete pool to waiting and clears readies', async ({
    queues,
    users,
    page,
  }) => {
    const { slug } = await queues.create({
      template: 'auto-6v6',
      launchMode: 'captain',
      enable: true,
    })
    const before = await autoSnapshot(page)
    const pages = await createPool(users, slug)
    await volunteer(pages)
    await pages[2]!.getByRole('button', { name: "Can't play right now", exact: true }).click()
    await expect.poll(() => state(page, slug)).toBe('waiting')
    await expect(pages[0]!.getByText('Players 11/12')).toBeVisible()
    await expect(pages[0]!.locator('[data-ready="true"]')).toHaveCount(0)
    await expect(pages[0]!.locator('#ready-up-dialog')).not.toBeVisible()
    expect(await autoSnapshot(page)).toEqual(before)
  })

  test('ready-up timeout kicks the unready players and returns an incomplete remainder to waiting', async ({
    queues,
    users,
    page,
  }) => {
    const { slug } = await queues.create({
      template: 'auto-6v6',
      launchMode: 'captain',
      enable: true,
    })
    await configure(users, slug, 4, 15)
    const before = await autoSnapshot(page)
    const pages = await createPool(users, slug)
    await volunteer(pages)
    await expect(pages[2]!.locator('#ready-up-dialog')).toBeVisible()
    await expect
      .poll(() => state(page, slug), { timeout: secondsToMilliseconds(10) })
      .toBe('waiting')
    await expect(pages[1]!.getByText('Players 1/12')).toBeVisible()
    await expect(pages[2]!.locator('#ready-up-dialog')).not.toBeVisible()
    expect(await autoSnapshot(page)).toEqual(before)
  })

  test('ready-up timeout starts drafting if the readied remainder is still full', async ({
    queues,
    users,
    page,
  }) => {
    const { slug } = await queues.create({
      template: 'auto-6v6',
      launchMode: 'captain',
      enable: true,
    })
    await configure(users, slug, 10, 30)
    const before = await autoSnapshot(page)
    const pages = await createPool(users, slug, 13)
    await volunteer(pages)
    await Promise.all(
      pages
        .filter((_, index) => index !== 1 && index !== 11)
        .map(player => player.getByRole('button', { name: "I'm ready", exact: true }).click()),
    )
    await expect
      .poll(() => state(page, slug), { timeout: secondsToMilliseconds(15) })
      .toBe('drafting')
    await expect(pages[11]!.locator('#ready-up-dialog')).not.toBeVisible()
    expect(await autoSnapshot(page)).toEqual(before)
  })

  test('ready-state deadline clears readies even if the pool is still full', async ({
    queues,
    users,
    page,
  }) => {
    const { slug } = await queues.create({
      template: 'auto-6v6',
      launchMode: 'captain',
      enable: true,
    })
    await configure(users, slug, 30, 4)
    const before = await autoSnapshot(page)
    const pages = await createPool(users, slug)
    await volunteer(pages)
    await expect(pages[2]!.locator('#ready-up-dialog')).toBeVisible()
    await expect
      .poll(() => state(page, slug), { timeout: secondsToMilliseconds(10) })
      .toBe('waiting')
    await expect(pages[0]!.getByText('Players 12/12')).toBeVisible()
    await expect(pages[0]!.locator('[data-ready="true"]')).toHaveCount(0)
    await expect(pages[0]!.locator('#captain-ready-status')).toBeEmpty()
    expect(await autoSnapshot(page)).toEqual(before)
  })
})
