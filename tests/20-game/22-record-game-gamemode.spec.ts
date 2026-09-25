import { launchGame as test, expect } from '../fixtures/launch-game'
import { GamePage } from '../pages/game.page'
import { getQueueConfig } from '../queue-slots'

test.use({ waitForStage: 'started' })
test('records the game under its gamemode @6v6 @9v9', async ({
  gameNumber,
  gameServer,
  desiredSlots,
  users,
  page,
  request,
}) => {
  const res = await request.get(`/api/v1/games/${gameNumber}`)
  expect(res.status()).toBe(200)
  expect(((await res.json()) as { gamemode: string }).gamemode).toBe(getQueueConfig())

  const [medicName] = [...desiredSlots.entries()].find(([, slot]) => slot === 'medic-1')!
  const medic = users.byName(medicName)
  const medicGameCount = page.getByLabel('Games played as medic')

  await page.goto(`/players/${medic.steamId}`)
  const before = Number(await medicGameCount.innerText())

  await gameServer.matchEnds()
  const gamePage = new GamePage(page, gameNumber)
  await gamePage.goto()
  await expect(gamePage.gameEvent('Game ended')).toBeVisible()

  await expect(async () => {
    await page.goto(`/players/${medic.steamId}`)
    await expect(medicGameCount).toHaveText(String(before + 1))
  }).toPass()
})
