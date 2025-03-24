import { mergeTests } from '@playwright/test'
import { accessMongoDb } from '../fixtures/access-mongo-db'
import { minutesToMilliseconds, secondsToMilliseconds } from 'date-fns'
import { launchGame, expect } from '../fixtures/launch-game'
import { waitForEmptyQueue } from '../fixtures/wait-for-empty-queue'

const test = mergeTests(accessMongoDb, launchGame, waitForEmptyQueue)

test.beforeEach(async ({ db }) => {
  const configuration = db.collection('configuration')
  await configuration.updateOne(
    { key: 'queue.pre_ready_up_timeout' },
    { $set: { value: secondsToMilliseconds(10) } },
    { upsert: true },
  )
})

test('pre-ready up button is visible for logged-in-users', async ({ users }) => {
  const page = await users.getNext().queuePage()
  await page.goto()
  await expect(page.preReadyUpButton()).toBeVisible()
})

test('pre-ready up button is enabled when a player joins the queue', async ({ users }) => {
  const page = await users.getNext().queuePage()
  await page.goto()
  await expect(page.preReadyUpButton()).toBeDisabled()
  await page.joinQueue('soldier-1')
  await expect(page.preReadyUpButton()).toBeEnabled()
  await page.leaveQueue()
  await expect(page.preReadyUpButton()).toBeDisabled()
})

test('pre-ready expires', async ({ users }) => {
  const page = await users.getNext().queuePage()
  await page.goto()
  await page.joinQueue('soldier-1')
  await page.preReadyUpButton().click()
  await expect(page.preReadyUpButton()).toHaveAttribute('aria-selected')
  await expect(page.preReadyUpButton()).toContainText(/\d+:\d+/)
  await expect(page.preReadyUpButton()).not.toHaveAttribute('aria-selected', {
    timeout: secondsToMilliseconds(12),
  })
  await expect(page.preReadyUpButton()).not.toContainText(/\d+:\d+/, {
    useInnerText: true,
  })
})

test('pre-ready up readies up when the queue is ready', async ({
  users,
  players,
  desiredSlots,
}) => {
  const preReadiedPlayers = players.slice(0, -1)
  const lastPlayer = players[players.length - 1]!

  await Promise.all(
    preReadiedPlayers.map(async user => {
      const page = await user.queuePage()
      await page.goto()
      const slot = desiredSlots.get(user.playerName)!
      await page.slot(slot).join()
      await page.preReadyUpButton().click()
    }),
  )

  {
    const page = await lastPlayer.queuePage()
    await page.goto()
    const slot = desiredSlots.get(lastPlayer.playerName)!
    await page.slot(slot).join()
  }

  await Promise.all(
    players.map(async user => {
      const page = await user.page()
      await page.waitForURL(/games\/(\d+)/)
    }),
  )

  {
    const page = await users.byName('Promenader').page()
    const matches = /games\/(\d+)/.exec(page.url())
    if (matches) {
      const gameNumber = Number(matches[1])
      // kill the game
      const adminPage = await users.getAdmin().gamePage(gameNumber)
      await adminPage.goto()
      await adminPage.forceEnd()
    } else {
      throw new Error('could not launch game')
    }
  }
})

test('pre-ready up enables automatically after readying up', async ({
  users,
  players,
  desiredSlots,
}) => {
  test.setTimeout(minutesToMilliseconds(2))
  const polemic = users.byName('Polemic')
  const shadowhunter = users.byName('Shadowhunter')

  await Promise.all(
    players
      .filter(p => p.playerName !== 'Polemic')
      .map(async user => {
        const page = await user.queuePage()
        await page.goto()
        const slot = desiredSlots.get(user.playerName)!
        await page.slot(slot).join()
      }),
  )

  const page = await polemic.queuePage()
  await page.goto()
  await page.slot(desiredSlots.get('Polemic')!).join()
  await expect(page.preReadyUpButton()).toHaveAttribute('aria-selected')

  {
    const page = await shadowhunter.queuePage()
    await page.readyUpDialog().readyUp()
    await expect(page.preReadyUpButton()).toHaveAttribute('aria-selected')
  }
})
