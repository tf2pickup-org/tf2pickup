import { launchGame as test, expect } from '../fixtures/launch-game'
import { minutesToMilliseconds } from 'date-fns'

test('player is late for ready up', async ({ players, desiredSlots, users, page }) => {
  test.setTimeout(minutesToMilliseconds(2))
  await Promise.all(
    players.map(async player => {
      const page = await player.queuePage()
      await page.goto()
      const slot = desiredSlots.get(player.playerName)!
      await page.slot(slot).join()
    }),
  )

  const lateUser = users.byName('MoonMan')
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
  const kickedUserPage = await lateUser.queuePage()
  await expect(kickedUserPage.slot('soldier-1').joinButton()).toBeVisible()

  // expect the ready up dialog to close
  await expect(kickedUserPage.readyUpDialog().readyUpButton()).not.toBeVisible()
  await expect(kickedUserPage.readyUpDialog().notReadyButton()).not.toBeVisible()

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
