import { minutesToMilliseconds, secondsToMilliseconds } from 'date-fns'
import { delay } from 'es-toolkit'
import { expect, launchGame as test } from '../fixtures/launch-game'

// the queue's default
const readyUpTimeout = secondsToMilliseconds(40)

test('a queue cleared while readying up starts its next ready-up afresh @6v6 @9v9', async ({
  players,
  desiredSlots,
  users,
}) => {
  test.setTimeout(minutesToMilliseconds(3))
  const fill = async () => {
    await Promise.all(
      players.map(async player => {
        const page = await player.queuePage()
        await page.goto()
        await page.slot(desiredSlots.get(player.playerName)!).join()
      }),
    )
  }
  // The admin plays too, so their ready-up dialog is in the way: they ready up first. They may
  // have joined last (readied automatically), or been kicked by a slow run's own timeout.
  const clear = async () => {
    const admin = await users.getAdmin().queuePage()
    const slot = admin.slot(desiredSlots.get(users.getAdmin().playerName)!)
    await admin.goto()
    if ((await slot.isTaken()) && !(await slot.isReady())) {
      await admin.readyUpDialog().readyUp()
      await expect(admin.readyUpDialog().readyUpButton()).not.toBeVisible()
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
