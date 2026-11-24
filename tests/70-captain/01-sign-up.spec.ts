import type { Page } from '@playwright/test'
import { expect, queues } from '../fixtures/queues'
import { defaultQueueSlug } from '../queue-slots'

const sixesRoles = [
  'scout:pocket',
  'scout:flank',
  'soldier:pocket',
  'soldier:roamer',
  'demoman:demoman',
  'medic:medic',
]

const test = queues.extend<{ captain: string }>({
  captain: async ({ queues }, use) => {
    const { slug } = await queues.create({
      template: 'auto-6v6',
      launchMode: 'captain',
      enable: true,
    })
    await use(slug)
  },
})

function role(page: Page, key: string) {
  return page.locator(`[data-role="${key}"]`)
}

function toggle(page: Page, key: string) {
  return role(page, key).getByRole('checkbox')
}

test.describe('captain sign-up pool @multi-queue', () => {
  test('toggling roles updates every viewer, and the last role leaves the pool', async ({
    users,
    captain,
  }) => {
    const player = await users.byName('Polemic').page()
    const viewer = await users.byName('Shadowhunter').page()
    await player.goto(`/q/${captain}`)
    await viewer.goto(`/q/${captain}`)

    await toggle(player, 'medic:medic').check()
    await toggle(player, 'demoman:demoman').check()
    await expect(role(viewer, 'medic:medic')).toContainText('Polemic')
    await expect(role(viewer, 'demoman:demoman')).toContainText('Polemic')
    await expect(viewer.getByText('Players 1/12')).toBeVisible()
    await expect(viewer.getByText('Roles 0/6')).toBeVisible()

    await toggle(player, 'medic:medic').uncheck()
    await expect(role(viewer, 'medic:medic')).not.toContainText('Polemic')
    await toggle(player, 'demoman:demoman').uncheck()
    await expect(viewer.getByText('Players 0/12')).toBeVisible()
    await expect(role(viewer, 'demoman:demoman')).toContainText('No one yet')
  })

  test('volunteering shows a chip and counts captains', async ({ users, captain }) => {
    const player = await users.byName('Polemic').page()
    const viewer = await users.byName('Shadowhunter').page()
    await player.goto(`/q/${captain}`)
    await viewer.goto(`/q/${captain}`)

    await expect(player.getByLabel('Volunteer as captain')).toBeDisabled()
    await toggle(player, 'medic:medic').check()
    await player.getByLabel('Volunteer as captain').check()
    await expect(viewer.getByRole('link', { name: 'Polemic' }).first()).toBeVisible()
    await expect(viewer.getByText('Captains 1/2')).toBeVisible()

    await toggle(player, 'medic:medic').uncheck()
    await expect(viewer.getByText('Captains 0/2')).toBeVisible()
  })

  test('counts the medic as uncovered in a 13-player pool with one medic', async ({
    users,
    captain,
  }) => {
    const members = users.getMany(13)
    const pages = await Promise.all(members.map(async member => await member.page()))
    await Promise.all(pages.map(async page => await page.goto(`/q/${captain}`)))

    await toggle(pages[0]!, 'medic:medic').check()
    for (const page of pages.slice(1)) {
      for (const key of sixesRoles.slice(0, 5)) {
        await toggle(page, key).check()
      }
    }

    await expect(pages[0]!.getByText('Players 13/12')).toBeVisible()
    await expect(pages[0]!.getByText('Roles 5/6')).toBeVisible()
  })

  test('has no map vote, friends or clear queue', async ({ users, captain }) => {
    const admin = await users.getAdmin().page()
    await admin.goto(`/q/${captain}`)
    await expect(admin.getByRole('button', { name: 'Clear queue' })).toHaveCount(0)
    await expect(admin.locator('#map-vote')).toHaveCount(0)
    await expect(admin.getByLabel('Mark as friend')).toHaveCount(0)
  })

  test('captain sign-up leaves the auto queue untouched, and the reverse', async ({
    users,
    captain,
  }) => {
    const viewer = await users.byName('Shadowhunter').page()
    const autoSlug = defaultQueueSlug()
    // the queue's own content; the shared switcher legitimately shows the other queue's count
    const snapshot = async (slug: string, selector: string) => {
      await viewer.goto(`/q/${slug}`)
      const dto = (await (await viewer.request.get(`/api/v1/queues/${slug}`)).json()) as unknown
      return { dto, html: await viewer.locator(selector).innerHTML() }
    }

    const autoBefore = await snapshot(autoSlug, '#queue')
    const player = await users.byName('Polemic').page()
    await player.goto(`/q/${captain}`)
    await toggle(player, 'medic:medic').check()
    await player.getByLabel('Volunteer as captain').check()
    await expect(role(player, 'medic:medic')).toContainText('Polemic')
    expect(await snapshot(autoSlug, '#queue')).toEqual(autoBefore)
    await expect(viewer.locator(`#queue-switcher-count-${captain}`)).toHaveText('1/12')

    const captainBefore = await snapshot(captain, '#captain-pool')
    const other = await users.byName('MoonMan').queuePage(autoSlug)
    await other.goto()
    await other.joinQueue('medic-1')
    expect(await snapshot(captain, '#captain-pool')).toEqual(captainBefore)
    await other.leaveQueue()
    expect(await snapshot(captain, '#captain-pool')).toEqual(captainBefore)
  })

  test('joining a captain queue leaves the auto queue and vice versa', async ({
    users,
    captain,
  }) => {
    const player = await users.byName('Polemic').queuePage(defaultQueueSlug())
    await player.goto()
    await player.joinQueue('medic-1')

    await player.page.goto(`/q/${captain}`)
    await toggle(player.page, 'medic:medic').check()
    await player.page.goto(`/q/${defaultQueueSlug()}`)
    await expect(player.slot('medic-1').joinButton()).toBeVisible()

    await player.joinQueue('medic-1')
    await player.page.goto(`/q/${captain}`)
    await expect(role(player.page, 'medic:medic')).toContainText('No one yet')
    await player.page.goto(`/q/${defaultQueueSlug()}`)
    await player.leaveQueue()
  })

  test('disables the checkboxes of an unverified player on a verified-only queue', async ({
    users,
    captain,
  }) => {
    const admin = await users.getAdmin().page()
    const response = await admin.request.post(`/admin/queues/${captain}`, {
      form: {
        name: captain,
        requireVerification: 'true',
        readyUpTimeout: '40',
        readyStateTimeout: '60',
        pickTimeout: '10',
        mapCooldown: '2',
      },
    })
    expect(response.ok()).toBe(true)

    // IronViper only plays 9v9 games, so they are never auto-verified in the 6v6 run.
    const player = await users.byName('IronViper').page()
    await player.goto(`/q/${captain}`)
    await expect(toggle(player, 'medic:medic')).toBeDisabled()
    await expect(player.getByText('You are not verified to join the queue').first()).toBeAttached()
  })
})
