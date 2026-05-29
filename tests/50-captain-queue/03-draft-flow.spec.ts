import { mergeTests } from '@playwright/test'
import { minutesToMilliseconds } from 'date-fns'
import { captainMode, expect } from '../fixtures/captain-mode'
import { simulateGameServer } from '../fixtures/simulate-game-server'
import { CaptainQueuePage } from '../pages/captain-queue.page'
import { GamePage } from '../pages/game.page'
import type { UserName } from '../user-manager'
import type { Tf2ClassName } from '../pages/captain-queue.page'

const test = mergeTests(captainMode, simulateGameServer)

// 6v6: 4 scouts, 4 soldiers, 2 demomen, 2 medics
const playerAssignments: [UserName, Tf2ClassName][] = [
  ['Promenader', 'scout'], // captain candidate
  ['Mayflower', 'scout'], // captain candidate
  ['Polemic', 'scout'],
  ['Shadowhunter', 'scout'],
  ['MoonMan', 'soldier'],
  ['Underfire', 'soldier'],
  ['Astropower', 'soldier'],
  ['LlamaDrama', 'soldier'],
  ['SlitherTuft', 'demoman'],
  ['Blacklight', 'demoman'],
  ['AstraGirl', 'medic'],
  ['BellBoy', 'medic'],
]

test('full captain draft: picks, map bans, game launch @6v6', async ({ users, gameServer }) => {
  test.setTimeout(minutesToMilliseconds(3))

  await gameServer.sendHeartbeat()

  // All 12 players join their assigned class
  await Promise.all(
    playerAssignments.map(async ([name, gameClass]) => {
      const queuePage = new CaptainQueuePage(await users.byName(name).page())
      await queuePage.goto()
      await queuePage.classColumn(gameClass).join()
    }),
  )

  // First two players opt in as captain candidates
  for (const [name] of playerAssignments.slice(0, 2)) {
    const queuePage = new CaptainQueuePage(await users.byName(name).page())
    await expect(queuePage.wantsCaptainLabel()).toContainText('I want to be captain', {
      timeout: 5000,
    })
    await queuePage.wantsCaptainToggle().check()
  }

  // All players ready up
  await Promise.all(
    playerAssignments.map(async ([name]) => {
      const queuePage = new CaptainQueuePage(await users.byName(name).page())
      await queuePage.readyUp()
    }),
  )

  // Both captain candidates wait for the draft board to appear
  const cap1 = new CaptainQueuePage(await users.byName('Promenader').page())
  const cap2 = new CaptainQueuePage(await users.byName('Mayflower').page())
  await cap1.draftBoard().waitToBeVisible()
  await cap2.draftBoard().waitToBeVisible()

  // 10 picks in ABBA order: whichever captain has "Your turn" picks first
  for (let i = 0; i < 10; i++) {
    const poolBefore = await cap1.draftBoard().poolPlayerCount()

    if (await cap1.draftBoard().isMyTurn()) {
      await cap1.draftBoard().firstPickButton().click()
    } else {
      await cap2.draftBoard().firstPickButton().click()
    }

    // Wait for the pool to shrink, confirming the pick was registered
    await expect
      .poll(() => cap1.draftBoard().poolPlayerCount(), { timeout: 10000 })
      .toBe(poolBefore - 1)
  }

  // Map ban phase: wait for it to appear
  await expect(cap1.draftBoard().mapBanPanel()).toBeVisible({ timeout: 10000 })

  // 2 map bans
  for (let i = 0; i < 2; i++) {
    const bannedBefore = await cap1.draftBoard().locator().locator('.map-ban-card.banned').count()

    if (await cap1.draftBoard().isMyTurn()) {
      await cap1.draftBoard().firstBanButton().click()
    } else {
      await cap2.draftBoard().firstBanButton().click()
    }

    // Wait for the ban to register
    await expect
      .poll(() => cap1.draftBoard().locator().locator('.map-ban-card.banned').count(), {
        timeout: 10000,
      })
      .toBe(bannedBefore + 1)
  }

  // Selected map is shown after all bans
  await expect(cap1.draftBoard().selectedMap()).toBeVisible({ timeout: 10000 })

  // All players should be redirected to the game page
  await Promise.all(
    playerAssignments.map(async ([name]) => {
      const userPage = await users.byName(name).page()
      await userPage.waitForURL(/games\/(\d+)/, { timeout: minutesToMilliseconds(1) })
    }),
  )

  // Extract game number from the first player's URL
  const firstPage = await users.byName('Promenader').page()
  const matches = /games\/(\d+)/.exec(firstPage.url())
  if (!matches) throw new Error('could not extract game number from URL')
  const gameNumber = Number(matches[1])

  // Cleanup: force-end the game via admin
  const admin = users.getAdmin()
  const gamePage = new GamePage(await admin.page(), gameNumber)
  await gamePage.goto()
  await gamePage.forceEnd()

  // Wait for game server's logaddress to be cleared
  await expect
    .poll(() => gameServer.logAddresses.size === 0, {
      message: 'logaddress should be cleared after game ends',
      timeout: 40000,
    })
    .toBe(true)

  const adminPage = await admin.adminPage()
  await adminPage.freeStaticGameServer()
})
