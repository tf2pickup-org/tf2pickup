import { mergeTests } from '@playwright/test'
import { accessMongoDb } from '../fixtures/access-mongo-db'
import { minutesToMilliseconds, secondsToMilliseconds } from 'date-fns'
import { launchGame, expect } from '../fixtures/launch-game'
import { waitForEmptyQueue } from '../fixtures/wait-for-empty-queue'

// eslint-disable-next-line @typescript-eslint/no-deprecated
const test = mergeTests(accessMongoDb, launchGame, waitForEmptyQueue)
const readyUpTimeout = secondsToMilliseconds(20)

test.beforeEach(async ({ db }) => {
  const configuration = db.collection('configuration')
  await configuration.updateOne(
    { key: 'queue.pre_ready_up_timeout' },
    { $set: { value: readyUpTimeout } },
    { upsert: true },
  )
})

test('pre-ready up button is visible for logged-in-users @6v6 @9v9', async ({ users }) => {
  const page = await users.getNext().queuePage()
  await page.goto()
  await expect(page.preReadyUpButton).toBeVisible()
})

test('pre-ready up button is enabled when a player joins the queue @6v6 @9v9', async ({ users }) => {
  const page = await users.getNext().queuePage()
  await page.goto()
  await expect(page.preReadyUpButton).toBeDisabled()
  await page.joinQueue('soldier-1')
  await expect(page.preReadyUpButton).toBeEnabled()
  await page.leaveQueue()
  await expect(page.preReadyUpButton).toBeDisabled()
})

test('pre-ready expires @6v6 @9v9', async ({ users }) => {
  const page = await users.getNext().queuePage()
  await page.goto()
  await page.joinQueue('soldier-1')
  await page.preReadyUpButton.click()
  await expect(page.preReadyUpButton).toHaveAttribute('aria-selected')
  await expect(page.preReadyUpButton).toContainText(/\d+:\d+/)
  await expect(page.preReadyUpButton).not.toHaveAttribute('aria-selected', {
    timeout: readyUpTimeout + secondsToMilliseconds(2),
  })
  await expect(page.preReadyUpButton).not.toContainText(/\d+:\d+/, {
    useInnerText: true,
  })
})

test('pre-ready up readies up when the queue is ready @6v6 @9v9', async ({
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
      await page.preReadyUp()
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

test('pre-ready up enables automatically after readying up @6v6 @9v9', async ({
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
  await expect(page.preReadyUpButton).toHaveAttribute('aria-selected')

  {
    const page = await shadowhunter.queuePage()
    await page.readyUpDialog().readyUp()
    await expect(page.preReadyUpButton).toHaveAttribute('aria-selected')
  }
})

test('does not ready up if switching classes as 11th player @6v6 @9v9', async ({
  users,
  players,
  desiredSlots,
}) => {
  const polemic = users.byName('Polemic')
  const firstSlot = desiredSlots.get('Polemic')!
  const secondSlot = desiredSlots.get('Shadowhunter')!

  await Promise.all(
    players
      .filter(p => p.playerName !== 'Shadowhunter')
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
  await page.slot(firstSlot).join()
  const slot = page.slot(secondSlot)
  await slot.join()
  expect(await slot.isReady()).toBe(false)
})
