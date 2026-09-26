import type { Page } from '@playwright/test'
import { minutesToMilliseconds, secondsToMilliseconds } from 'date-fns'
import { delay } from 'es-toolkit'
import { expect, launchGame as test } from '../fixtures/launch-game'

const readyUpTimeout = secondsToMilliseconds(20)
const keys = ['queue.ready_up_timeout', 'queue.ready_state_timeout'] as const

async function configure(page: Page, key: string, value: string) {
  await page.goto('/admin/view-for-nerds')
  const input = page.getByLabel(key, { exact: true })
  await input.fill(value)
  await Promise.all([
    page.waitForResponse(
      response => response.url().endsWith('/admin/view-for-nerds') && response.ok(),
    ),
    input.press('Enter'),
  ])
}

let saved: string[] = []

test.beforeEach(async ({ users }) => {
  const page = await users.getAdmin().page()
  await page.goto('/admin/view-for-nerds')
  saved = await Promise.all(keys.map(key => page.getByLabel(key, { exact: true }).inputValue()))
  await configure(page, keys[0], readyUpTimeout.toString())
  await configure(page, keys[1], secondsToMilliseconds(30).toString())
})

test.afterEach(async ({ users }) => {
  const page = await users.getAdmin().page()
  for (const [i, key] of keys.entries()) {
    await configure(page, key, saved[i]!)
  }
})

test('a queue cleared while readying up starts its next ready-up afresh @6v6 @9v9', async ({
  players,
  desiredSlots,
  users,
}) => {
  test.setTimeout(minutesToMilliseconds(2))
  const fill = async () => {
    await Promise.all(
      players.map(async player => {
        const page = await player.queuePage()
        await page.goto()
        await page.slot(desiredSlots.get(player.playerName)!).join()
      }),
    )
  }
  // the admin plays too, so their ready-up dialog is in the way, unless they were the last to join
  const clear = async () => {
    const admin = await users.getAdmin().queuePage()
    await admin.goto()
    if (!(await admin.slot(desiredSlots.get(users.getAdmin().playerName)!).isReady())) {
      const readyUp = admin.readyUpDialog().readyUpButton()
      await expect(readyUp).toBeVisible()
      await admin.page.keyboard.press('Escape')
      await expect(readyUp).not.toBeVisible()
    }
    await admin.clearQueue()
  }

  await fill()
  const firstReadyUp = Date.now()
  await clear()

  // refilled while the first ready-up's timeout is still pending, but late enough for the
  // second one's own timeout to come well after it
  await delay(Math.max(0, firstReadyUp + secondsToMilliseconds(8) - Date.now()))
  await fill()
  await delay(Math.max(0, firstReadyUp + readyUpTimeout + secondsToMilliseconds(2) - Date.now()))

  const watcher = await players[1]!.queuePage()
  await watcher.goto()
  await expect(watcher.header()).toContainText(`${players.length}/${players.length}`)
  await clear()
})
