// Runs against tf2pickup 4.23.13, the last release before multi-queue. Everything here must keep
// working against that version's UI.
import { launchGame as test, expect } from '../fixtures/launch-game'
import { GamePage } from '../pages/game.page'
import { saveState } from './state'
import {
  defaultPlayerSkill,
  mapPool,
  playerSkillThreshold,
  skilledPlayer,
  skilledPlayerSkill,
} from './seed'

test.use({ waitForStage: 'started' })
test('seed a 4.x instance', async ({ users, desiredSlots, gameNumber, gameServer, page }) => {
  const admin = await users.getAdmin().adminPage()
  await admin.updateSkill(users.byName(skilledPlayer).steamId, skilledPlayerSkill)

  const adminPage = await users.getAdmin().page()
  await adminPage.goto('/admin/player-restrictions')
  await adminPage.getByLabel("Player's skill on medic").fill(defaultPlayerSkill.medic.toString())
  await adminPage.getByRole('button', { name: 'Save' }).click()
  await expect(adminPage.getByText('Configuration saved')).toBeVisible()

  await gameServer.roundEnds('blu')
  await gameServer.matchEnds()
  const gamePage = new GamePage(page, gameNumber)
  await gamePage.goto()
  await expect(gamePage.gameEvent('Game ended')).toBeVisible()

  const [medicName] = [...desiredSlots.entries()].find(([, slot]) => slot === 'medic-1')!
  const medic = users.byName(medicName)
  const medicRow = adminPage.getByRole('row', { name: /medic/ })
  let medicElo = ''
  await expect(async () => {
    await adminPage.goto(`/players/${medic.steamId}/edit/elo`)
    await expect(medicRow.getByRole('cell').nth(2)).toHaveText('1')
    medicElo = await medicRow.getByRole('cell').nth(1).innerText()
    expect(medicElo).not.toBe('1500')
  }).toPass()

  // after the game, so they don't get in its way
  await admin.configurePlayerSkillThreshold(playerSkillThreshold)
  await admin.configureRequirePlayerVerification(true)

  await adminPage.goto('/admin/map-pool')
  const names = adminPage.locator('input[name="name[]"]')
  const configs = adminPage.locator('input[name="execConfig[]"]')
  for (const [i, { name, execConfig }] of mapPool.entries()) {
    await names.nth(i).fill(name)
    await configs.nth(i).fill(execConfig)
  }
  while ((await names.count()) > mapPool.length) {
    await adminPage.locator('button[data-remove-closest="tr"]').last().click()
  }
  await adminPage.getByRole('button', { name: 'Save' }).click()
  await expect(adminPage.getByText('Configuration saved')).toBeVisible()

  await saveState({ gameNumber, medic: medic.steamId, medicElo })
})
