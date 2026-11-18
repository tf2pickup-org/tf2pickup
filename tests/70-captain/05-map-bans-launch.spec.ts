import { mergeTests } from '@playwright/test'
import { secondsToMilliseconds, minutesToMilliseconds } from 'date-fns'
import { MongoClient } from 'mongodb'
import type { CaptainPoolModel } from '../../src/database/models/captain-pool.model'
import type { QueueModel } from '../../src/database/models/queue.model'
import type { CaptainDraftModel } from '../../src/database/models/captain-draft.model'
import type { GameModel } from '../../src/database/models/game.model'
import type { PlayerModel } from '../../src/database/models/player.model'
import { queues, expect } from '../fixtures/queues'
import { simulateGameServer } from '../fixtures/simulate-game-server'
import { defaultQueueSlug } from '../queue-slots'
import { GamePage } from '../pages/game.page'

const test = mergeTests(queues, simulateGameServer)
const roles = ['scout:pocket', 'scout:flank', 'soldier:pocket', 'soldier:roamer', 'demoman:demoman']

test('map bans launch the drafted teams, show crowns, and rate captain ladders only @multi-queue', async ({
  queues,
  users,
  gameServer,
  page,
}) => {
  test.setTimeout(minutesToMilliseconds(4))
  // Read-only assertions: all setup and game events use the UI or existing simulator API.
  const client = await MongoClient.connect(process.env['MONGODB_URI']!)
  const db = client.db()
  const games = db.collection<GameModel>('games')
  const players = db.collection<PlayerModel>('players')
  const drafts = db.collection<CaptainDraftModel>('captain.drafts')
  let gameNumber: number | undefined
  const admin = await users.getAdmin().adminPage()
  try {
    await gameServer.sendHeartbeat()
    const { slug } = await queues.create({
      template: 'auto-6v6',
      launchMode: 'captain',
      enable: true,
    })
    const adminPage = await users.getAdmin().page()
    expect(
      (
        await adminPage.request.post(`/admin/queues/${slug}`, {
          form: {
            name: slug,
            readyUpTimeout: '40',
            readyStateTimeout: '60',
            pickTimeout: '40',
            mapCooldown: '2',
          },
        })
      ).ok(),
    ).toBe(true)
    const queue = await db.collection<QueueModel>('queues').findOne({ slug })
    expect(queue).toBeTruthy()
    const queueId = queue!._id
    const members = [...users].slice(0, 14)
    const before = await players
      .find({ steamId: { $in: members.map(member => member.steamId) } })
      .toArray()
    const pages = await Promise.all(members.map(member => member.page()))
    await page.goto(`/q/${defaultQueueSlug()}`)
    const autoBefore = await page.locator('#queue').innerHTML()
    await Promise.all(pages.map(memberPage => memberPage.goto(`/q/${slug}`)))
    // Hold medic out until the last two sign-ups so all 14 become locked in this draft.
    for (const [index, memberPage] of pages.entries()) {
      const signupRoles = index < 12 ? roles : ['medic:medic']
      for (const role of signupRoles)
        await memberPage.locator(`[data-role="${role}"] input`).check()
      if (index < 13) {
        const preReady = memberPage.getByRole('button', { name: 'Pre-ready up' })
        if ((await preReady.getAttribute('aria-pressed')) !== 'true') await preReady.click()
        await expect(preReady).toHaveAttribute('aria-pressed', 'true')
      }
      if (index < 2) await memberPage.getByLabel('Volunteer as captain').check()
    }
    const state = async () =>
      ((await (await page.request.get(`/api/v1/queues/${slug}`)).json()) as { state: string }).state
    await expect.poll(state).toMatch(/^(ready|drafting)$/)
    if ((await state()) === 'ready') {
      const unready = await db
        .collection<CaptainPoolModel>('captain.pool')
        .find({ queue: queueId, ready: false })
        .toArray()
      await Promise.all(
        unready.map(async member => {
          const readyPage =
            pages[members.findIndex(user => user.steamId === member.player.steamId)]!
          await readyPage.getByRole('button', { name: "I'm ready", exact: true }).click()
        }),
      )
    }
    await expect.poll(state).toBe('drafting')
    // Commit legal UI choices; the engine may force the final unique choices itself.
    for (let i = 0; i < 10 && (await state()) === 'drafting'; i++) {
      const saved = await drafts.findOne({ queue: queueId })
      expect(saved).toBeTruthy()
      const count = saved!.picks.length
      if (count === 10) break
      const team = ['red', 'blu', 'blu', 'red', 'red', 'blu', 'blu', 'red', 'red', 'blu'][count] as
        'red' | 'blu'
      const captain = pages[members.findIndex(member => member.steamId === saved![team])]!
      const pick = captain.locator('#captain-draft button[data-pick-button]').first()
      await expect(pick).toBeVisible()
      const pickedId = await pick.getAttribute('data-draft-player')
      await pick.click()
      await expect(captain.locator(`#captain-draft [data-draft-player="${pickedId}"]`)).toHaveCount(
        0,
      )
      await expect
        .poll(async () => (await drafts.findOne({ queue: queueId }))?.picks.length ?? 0)
        .toBeGreaterThan(count)
    }
    await expect.poll(state).toBe('banningMaps')
    const lockedBefore = await db
      .collection<CaptainPoolModel>('captain.pool')
      .find({ queue: queueId, locked: true })
      .toArray()
    const draft = (await drafts.findOne({ queue: queueId }))!
    expect(draft.picks).toHaveLength(10)
    expect(draft.mapOptions).toHaveLength(3)
    const captainPage = (steamId: string) =>
      pages[members.findIndex(member => member.steamId === steamId)]!
    const blu = captainPage(draft.blu)
    const red = captainPage(draft.red)
    await expect(blu.getByRole('heading', { name: 'Your ban', exact: true })).toBeVisible()
    await expect(red.locator('button[name=banmap]')).toHaveCount(0)
    const newcomer = [...users][14]!
    const nextPage = await newcomer.page()
    await nextPage.goto(`/q/${slug}`)
    await nextPage.locator('#captain-pool [data-role="medic:medic"] input').check()
    const firstMap = draft.mapOptions[0]!
    await blu.getByRole('button', { name: `Ban ${firstMap}`, exact: true }).click()
    await expect(red.getByRole('heading', { name: 'Your ban', exact: true })).toBeVisible()
    await expect(red.locator('[data-banned]')).toHaveCount(1)
    const secondMap = draft.mapOptions[1]!
    await red.getByRole('button', { name: `Ban ${secondMap}`, exact: true }).click()
    await expect(pages[0]!).toHaveURL(/\/games\/\d+/)
    gameNumber = Number(/games\/(\d+)/.exec(pages[0]!.url())![1])
    const game = (await games.findOne({ number: gameNumber }))!
    expect(game.launchMode).toBe('captain')
    expect(game.captains).toEqual({ red: draft.red, blu: draft.blu })
    expect(game.map).toBe(draft.mapOptions[2])
    expect(game.slots).toHaveLength(12)
    for (const pick of draft.picks)
      expect(game.slots).toContainEqual(
        expect.objectContaining({
          player: pick.player,
          team: pick.team,
          gameClass: pick.role.split(':')[0],
        }),
      )
    expect(game.slots.every(slot => !('skill' in slot))).toBe(true)
    await page.goto(`/games/${gameNumber}`)
    await expect(page.getByRole('img', { name: 'Captain', exact: true })).toHaveCount(2)
    for (const captain of [draft.red, draft.blu]) {
      const user = members.find(member => member.steamId === captain)!
      await expect(
        page
          .getByLabel(`${user.playerName}'s slot`)
          .getByRole('img', { name: 'Captain', exact: true }),
      ).toBeVisible()
    }
    await expect(page.locator('.player-assigned-skill')).toHaveCount(0)
    await expect.poll(async () => drafts.findOne({ queue: queueId })).toBeNull()
    const unpicked = members.filter(
      member => !game.slots.some(slot => slot.player === member.steamId),
    )
    expect(unpicked).toHaveLength(2)
    const returned = await db
      .collection<CaptainPoolModel>('captain.pool')
      .find({ queue: queueId })
      .toArray()
    expect(returned.map(member => member.player.steamId).sort()).toEqual(
      [...unpicked.map(member => member.steamId), newcomer.steamId].sort(),
    )
    expect(returned.every(member => !member.locked)).toBe(true)
    for (const member of returned) {
      if (member.player.steamId === newcomer.steamId) expect(member.roles).toEqual(['medic:medic'])
      else {
        const original = lockedBefore.find(
          original => original.player.steamId === member.player.steamId,
        )!
        expect(member.roles).toEqual(original.roles)
        expect(member.volunteer).toBe(original.volunteer)
        expect(member.joinedAt).toEqual(original.joinedAt)
      }
    }
    const queueAfter = await db.collection<QueueModel>('queues').findOne({ _id: queueId })
    expect(queueAfter!.maps).toContainEqual(
      expect.objectContaining({ name: game.map, cooldown: 2 }),
    )
    const gamePage = new GamePage(page, gameNumber)
    await expect(gamePage.gameEvent('Game server initialized')).toBeVisible({
      timeout: secondsToMilliseconds(45),
    })
    await gameServer.connectAllPlayers()
    await gameServer.matchStarts()
    await expect(gamePage.gameEvent('Game started')).toBeVisible()
    await page.waitForTimeout(secondsToMilliseconds(2))
    await gameServer.roundEnds('red')
    await gameServer.matchEnds()
    await expect(gamePage.gameEvent('Game ended')).toBeVisible()
    await expect(async () => {
      const rated = await players
        .find({ steamId: { $in: game.slots.map(slot => slot.player) } })
        .toArray()
      expect(rated).toHaveLength(12)
      for (const player of rated) {
        const entry = player.eloHistory?.find(entry => entry.game === gameNumber)
        expect(entry?.launchMode).toBe('captain')
        expect(entry?.overall).toEqual(expect.any(Number))
        expect(Object.keys(entry!.elo)).toHaveLength(1)
        const isCaptain = player.steamId === draft.red || player.steamId === draft.blu
        if (isCaptain) expect(entry?.captain).toEqual(expect.any(Number))
        else expect(entry?.captain).toBeUndefined()
        expect(player.elo).toEqual(
          before.find(original => original.steamId === player.steamId)?.elo,
        )
      }
    }).toPass()
    await page.goto(`/q/${defaultQueueSlug()}`)
    expect(await page.locator('#queue').innerHTML()).toBe(autoBefore)
  } finally {
    if (gameNumber !== undefined) {
      const gamePage = await users.getAdmin().gamePage(gameNumber)
      if (await gamePage.isLive()) await gamePage.forceEnd()
      await admin.freeStaticGameServer()
    }
    await client.close()
  }
})
