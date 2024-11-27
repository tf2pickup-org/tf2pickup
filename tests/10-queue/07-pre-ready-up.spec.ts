import { mergeTests } from '@playwright/test'
import { accessMongoDb } from '../fixtures/access-mongo-db'
import { secondsToMilliseconds } from 'date-fns'
import { launchGame, expect } from '../fixtures/launch-game'

const test = mergeTests(accessMongoDb, launchGame)

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
  await expect(page.preReadyUpButton()).toBeVisible()
})

test('pre-ready up button is enabled when a player joins the queue', async ({ users }) => {
  const page = await users.getNext().queuePage()
  await expect(page.preReadyUpButton()).toBeDisabled()
  await page.joinQueue(3)
  await expect(page.preReadyUpButton()).toBeEnabled()
  await page.leaveQueue()
  await expect(page.preReadyUpButton()).toBeDisabled()
})

test('pre-ready expires', async ({ users }) => {
  const page = await users.getNext().queuePage()
  await page.joinQueue(4)
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
      const slot = desiredSlots.get(user.playerName)!
      await page.slot(slot).join()
      await page.preReadyUpButton().click()
    }),
  )

  {
    const page = await lastPlayer.queuePage()
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
    const matches = page.url().match(/games\/(\d+)/)
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
