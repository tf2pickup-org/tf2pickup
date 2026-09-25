// Runs on the primary instance after the incoming one was merged into it.
import { authUsers } from '../fixtures/auth-users'
import { expect, launchGame } from '../fixtures/launch-game'
import { GamePage } from '../pages/game.page'
import {
  incomingDefaultSpySkill,
  incomingMapPool,
  incomingWhitelistId,
  incomingSkill,
  loadState,
  primarySkill,
  skilledPlayer,
  sourceHost,
} from './seed'

interface QueueList {
  _embedded: { queues: { slug: string }[] }
}

authUsers('both instances have their queue enabled', async ({ request }) => {
  const list = (await (await request.get('/api/v1/queues')).json()) as QueueList
  expect(list._embedded.queues.map(({ slug }) => slug)).toEqual(['auto-6v6', 'auto-9v9'])
})

authUsers('incoming games get new numbers, and old links find them', async ({ request, page }) => {
  const { primaryGame, incomingGame } = await loadState()
  const newNumber = primaryGame! + 1

  const gamemode = async (number: number) =>
    ((await (await request.get(`/api/v1/games/${number}`)).json()) as { gamemode: string }).gamemode
  expect(await gamemode(primaryGame!)).toBe('6v6')
  expect(await gamemode(newNumber)).toBe('9v9')

  const legacy = await request.get(`/games/${incomingGame}?i=${sourceHost}`, { maxRedirects: 0 })
  expect(legacy.status()).toBe(301)
  expect(legacy.headers()['location']).toBe(`/games/${newNumber}`)

  const own = await request.get(`/games/${primaryGame}`, { maxRedirects: 0 })
  expect(own.status()).toBe(200)

  const gamePage = new GamePage(page, newNumber)
  await gamePage.goto()
  await expect(gamePage.gameEvent('Game ended')).toBeVisible()
})

authUsers('players keep what they had on both instances', async ({ users }) => {
  const admin = await users.getAdmin().page()
  const player = users.byName(skilledPlayer).steamId
  await admin.goto(`/players/${player}`)

  for (const [gamemode, skill] of [
    ['6v6', primarySkill],
    ['9v9', incomingSkill],
  ] as const) {
    for (const [gameClass, value] of Object.entries(skill)) {
      await expect(admin.getByLabel(`Player's ${gamemode} skill on ${gameClass}`)).toHaveValue(
        value.toString(),
      )
    }
  }

  // Promenader plays scout-1 in both instances' games
  await admin.goto(`/players/${users.byName('Promenader').steamId}`)
  await expect(admin.getByLabel('6v6 games played as scout')).toHaveText('1')
  await expect(admin.getByLabel('9v9 games played as scout')).toHaveText('1')
  await expect(
    admin.getByText('Total games played:').locator('xpath=following-sibling::span[1]'),
  ).toHaveText('2')
})

authUsers('the incoming queue keeps its map pool', async ({ users }) => {
  expect(await (await users.getAdmin().adminPage()).mapPool('auto-9v9')).toEqual(incomingMapPool)
})

authUsers("the incoming instance's settings apply to its gamemode", async ({ users }) => {
  const admin = await users.getAdmin().page()
  await admin.goto('/admin/player-restrictions')
  await expect(admin.getByLabel('Default 9v9 skill on spy')).toHaveValue(
    incomingDefaultSpySkill.toString(),
  )
  await expect(admin.getByLabel('Default 6v6 skill on scout')).toHaveValue('1')

  await admin.goto('/admin/games')
  await expect(admin.getByLabel('9v9 whitelist ID')).toHaveValue(incomingWhitelistId)
  await expect(admin.getByLabel('6v6 whitelist ID')).toHaveValue('')
  await expect(admin.getByLabel('Whitelist ID', { exact: true })).toHaveValue('')
})

launchGame.describe('the incoming queue', () => {
  launchGame.use({ waitForStage: 'launching', queue: { slug: 'auto-9v9', gamemode: '9v9' } })
  launchGame('keeps launching games', async ({ gameNumber, gameServer, request }) => {
    const { primaryGame } = await loadState()
    expect(gameNumber).toBe(primaryGame! + 2)

    const { map, gamemode } = (await (await request.get(`/api/v1/games/${gameNumber}`)).json()) as {
      map: string
      gamemode: string
    }
    expect(gamemode).toBe('9v9')
    await expect(gameServer).toHaveCommand(
      `exec ${incomingMapPool.find(({ name }) => name === map)!.execConfig}`,
    )
    await expect(gameServer).toHaveCommand(`tftrue_whitelist_id ${incomingWhitelistId}`)
  })
})
