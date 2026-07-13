import { launchGame as test, expect } from '../fixtures/launch-game'
import { minutesToMilliseconds, secondsToMilliseconds } from 'date-fns'

test('ready-up dialog is shown again after page refresh @6v6', async ({
  players,
  desiredSlots,
  users,
}) => {
  test.setTimeout(minutesToMilliseconds(2))

  await Promise.all(
    players.map(async player => {
      const page = await player.queuePage()
      await page.goto()
      await page.slot(desiredSlots.get(player.playerName)!).join()
    }),
  )

  const moonManPage = await users.byName('MoonMan').queuePage()
  await expect(moonManPage.readyUpDialog().readyUpButton()).toBeVisible()

  await moonManPage.page.reload()
  await expect(moonManPage.readyUpDialog().readyUpButton()).toBeVisible({
    timeout: secondsToMilliseconds(10),
  })

  // everybody leaves the queue
  await Promise.all(
    players.map(async player => {
      const page = await player.queuePage()
      await page.readyUpDialog().notReady()
    }),
  )
})
