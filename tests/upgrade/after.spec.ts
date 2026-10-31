// Runs against the version under test, started on the database the before-specs filled on 4.23.13.
import { authUsers } from '../fixtures/auth-users'
import { expect, launchGame } from '../fixtures/launch-game'
import { GamePage } from '../pages/game.page'
import { AdminQueuesPage } from '../pages/admin-queues.page'
import { queuePresets } from '../../src/queues/presets'
import { defaultQueueSlug, getQueueConfig } from '../queue-slots'
import { loadState } from './state'
import {
  defaultPlayerSkill,
  mapCooldown,
  mapPool,
  readyUpTimeoutSeconds,
  playerSkillThreshold,
  skilledPlayer,
  skilledPlayerSkill,
} from './seed'

authUsers('player skill survives the upgrade', async ({ users }) => {
  const admin = await users.getAdmin().page()
  await admin.goto(`/players/${users.byName(skilledPlayer).steamId}`)
  for (const [gameClass, skill] of Object.entries(skilledPlayerSkill)) {
    await expect(admin.getByLabel(`Player's skill on ${gameClass}`)).toHaveValue(skill.toString())
  }
})

authUsers('default player skill survives the upgrade', async ({ users }) => {
  const admin = await users.getAdmin().page()
  await admin.goto('/admin/player-restrictions')
  await expect(admin.getByLabel(`Default ${getQueueConfig()} skill on medic`)).toHaveValue(
    defaultPlayerSkill.medic.toString(),
  )
})

authUsers('player restrictions survive the upgrade', async ({ users }) => {
  const admin = await users.getAdmin().page()
  await admin.goto(`/admin/queues/${defaultQueueSlug()}`)
  await expect(admin.getByLabel('Player skill threshold', { exact: true })).toBeChecked()
  await expect(admin.getByLabel('Player skill threshold value', { exact: true })).toHaveValue(
    playerSkillThreshold.toString(),
  )
  await expect(admin.getByLabel('Require player verification')).toBeChecked()
  await expect(admin.getByLabel('Ready-up timeout (seconds)')).toHaveValue(
    readyUpTimeoutSeconds.toString(),
  )
  await expect(admin.getByLabel('Map cooldown')).toHaveValue(mapCooldown.toString())
})

authUsers('every preset is added and only the old queue is enabled', async ({ users }) => {
  const admin = new AdminQueuesPage(await users.getAdmin().page())
  await admin.goto()
  for (const { slug } of queuePresets) {
    await expect(admin.row(slug).getByRole('button', { name: 'Disable' })).toBeVisible({
      visible: slug === defaultQueueSlug(),
    })
  }
})

authUsers('the map pool survives the upgrade', async ({ users }) => {
  expect(await (await users.getAdmin().adminPage()).mapPool()).toEqual(mapPool)
})

authUsers('played games survive the upgrade', async ({ users, request }) => {
  const { gameNumber, medic, medicElo } = await loadState()
  const page = await users.getAdmin().page()

  const res = await request.get(`/api/v1/games/${gameNumber}`)
  expect(((await res.json()) as { gamemode: string }).gamemode).toBe(getQueueConfig())

  const gamePage = new GamePage(page, gameNumber)
  await gamePage.goto()
  await expect(gamePage.gameEvent('Game ended')).toBeVisible()

  const player = (await (await request.get(`/api/v1/players/${medic}`)).json()) as {
    stats: { gamesByClass: unknown }
  }
  expect(player.stats.gamesByClass).toEqual({ [getQueueConfig()]: { medic: 1 } })

  await page.goto(`/players/${medic}`)
  await expect(page.getByLabel('Games played as medic')).toHaveText('1')

  await page.goto(`/players/${medic}/edit/elo`)
  const medicRow = page.getByRole('row', { name: /medic/ })
  await expect(medicRow.getByRole('cell').nth(1)).toHaveText(medicElo)
  await expect(medicRow.getByRole('cell').nth(2)).toHaveText('1')
})

launchGame.use({ waitForStage: 'started' })
launchGame(
  'games keep being recorded after the upgrade',
  async ({ gameNumber, gameServer, desiredSlots, users, page, request }) => {
    const { map } = (await (await request.get(`/api/v1/games/${gameNumber}`)).json()) as {
      map: string
    }
    await expect(gameServer).toHaveCommand(
      `exec ${mapPool.find(({ name }) => name === map)!.execConfig}`,
    )

    await gameServer.matchEnds()
    const gamePage = new GamePage(page, gameNumber)
    await gamePage.goto()
    await expect(gamePage.gameEvent('Game ended')).toBeVisible()

    const [medicName] = [...desiredSlots.entries()].find(([, slot]) => slot === 'medic-1')!
    await expect(async () => {
      await page.goto(`/players/${users.byName(medicName).steamId}`)
      await expect(page.getByLabel('Games played as medic')).toHaveText('2')
    }).toPass()
  },
)
