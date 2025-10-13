import { launchGame as test, expect } from '../fixtures/launch-game'
import { minutesToMilliseconds } from 'date-fns'

test('player is late for ready up', async ({ players, desiredSlots, users, page }) => {
  test.setTimeout(minutesToMilliseconds(2))

  const lateUserPage = await users.byName('MoonMan').queuePage()
  await lateUserPage.goto()
  await lateUserPage.slot(desiredSlots.get('MoonMan')!).join()

  await Promise.all(
    players
      .filter(player => player.playerName !== 'MoonMan')
      .map(async player => {
        const page = await player.queuePage()
        await page.goto()
        const slot = desiredSlots.get(player.playerName)!
        await page.slot(slot).join()
      }),
  )

  await Promise.all(
    players
      .filter(player => player.playerName !== 'MoonMan')
      .map(async player => {
        const page = await player.queuePage()
        await page.readyUpDialog().readyUp()
      }),
  )

  // player gets kicked
  await expect(page.getByRole('heading', { name: /^Players:/ })).toHaveText('Players: 11/12', {
    timeout: 60000,
  })

  await expect(lateUserPage.slot('soldier-1').joinButton()).toBeVisible()

  // expect the ready up dialog to close
  await expect(lateUserPage.readyUpDialog().readyUpButton()).not.toBeVisible()
  await expect(lateUserPage.readyUpDialog().notReadyButton()).not.toBeVisible()

  // everybody leaves the queue
  await Promise.all(
    players
      .filter(player => player.playerName !== 'MoonMan')
      .map(async player => {
        const page = await player.queuePage()
        await page.leaveQueue(minutesToMilliseconds(1))
      }),
  )
})
