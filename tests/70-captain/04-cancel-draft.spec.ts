import type { Page } from '@playwright/test'
import { minutesToMilliseconds } from 'date-fns'
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

// 12 players, two per role, all pre-readied: the draft starts as soon as the pool is full.
// The first two volunteer for captain.
async function startDraft(users: UserManager, slug: string): Promise<Page[]> {
  const pages = await Promise.all([...users].slice(0, 12).map(member => member.page()))
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

async function state(page: Page, slug: string) {
  const dto = (await (await page.request.get(`/api/v1/queues/${slug}`)).json()) as { state: string }
  return dto.state
}

async function autoSnapshot(page: Page) {
  const slug = defaultQueueSlug()
  await page.goto(`/q/${slug}`)
  return {
    state: await state(page, slug),
    html: await page.locator('#queue').innerHTML(),
  }
}

test.describe('cancelling a captain draft @multi-queue', () => {
  test.setTimeout(minutesToMilliseconds(2))

  test('a captain ends the draft at the price of a cooldown, and everyone else keeps their place', async ({
    queues,
    users,
    page,
  }) => {
    const { slug } = await queues.create({
      template: 'auto-6v6',
      launchMode: 'captain',
      enable: true,
    })
    const members = [...users].slice(0, 12)
    const admin = await users.getAdmin().adminPage()
    for (const member of members.slice(0, 2)) {
      await admin.setPlayerCooldown(member.steamId, 0)
    }
    const autoBefore = await autoSnapshot(page)
    const pages = await startDraft(users, slug)
    await expect.poll(() => state(page, slug)).toBe('drafting')

    const captains = [pages[0]!, pages[1]!] as const
    const [firstIsRed] = await Promise.all(
      captains.map(async p => (await p.getByText('Your pick — pick 1').count()) > 0),
    )
    const captain = firstIsRed ? captains[0] : captains[1]
    const other = firstIsRed ? captains[1] : captains[0]
    const captainUser = firstIsRed ? members[0]! : members[1]!
    await expect(pages[5]!.getByRole('button', { name: 'Cancel draft' })).toHaveCount(0)
    await expect(captain.getByRole('button', { name: 'Cancel draft' })).toBeVisible()
    await expect(other.getByRole('button', { name: 'Cancel draft' })).toBeVisible()

    captain.once('dialog', dialog => {
      expect(dialog.message()).toBe('Cancel the draft? You will get a cooldown.')
      void dialog.accept()
    })
    await captain.getByRole('button', { name: 'Cancel draft' }).click()

    await expect.poll(() => state(page, slug)).toBe('waiting')
    await expect(pages[5]!.getByText(`Draft cancelled by ${captainUser.playerName}`)).toBeVisible()
    await expect(pages[5]!.locator('#captain-draft')).not.toHaveAttribute('data-active')
    await expect(pages[5]!.getByText('Players 11/12')).toBeVisible()
    await expect(pages[5]!.locator('#captain-pool input[type=checkbox]').first()).toBeVisible()
    await expect(other.getByRole('button', { name: 'Cancel draft' })).toHaveCount(0)
    await expect(captain.getByText('Cancelled a captain draft')).toBeVisible()
    await expect(
      captain.locator(`#captain-pool [data-player="${captainUser.steamId}"]`),
    ).toHaveCount(0)
    expect(await autoSnapshot(page)).toEqual(autoBefore)

    const cooldown = await (await admin.playerCooldown(captainUser.steamId)).inputValue()
    expect(cooldown).toBe('1')
    for (const member of members.slice(0, 2)) {
      await admin.setPlayerCooldown(member.steamId, 0)
      await admin.revokeAllBans(member.steamId)
    }
  })

  test('declining the confirmation leaves the draft running', async ({ queues, users, page }) => {
    const { slug } = await queues.create({
      template: 'auto-6v6',
      launchMode: 'captain',
      enable: true,
    })
    const pages = await startDraft(users, slug)
    await expect.poll(() => state(page, slug)).toBe('drafting')

    pages[0]!.once('dialog', dialog => void dialog.dismiss())
    await pages[0]!.getByRole('button', { name: 'Cancel draft' }).click()
    await pages[0]!.waitForTimeout(1000)

    expect(await state(page, slug)).toBe('drafting')
    await expect(pages[5]!.locator('#captain-draft')).toHaveAttribute('data-active')
    await expect(pages[0]!.getByText('Cancelled a captain draft')).toHaveCount(0)
  })
})
