import { readFile, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import type { Page } from '@playwright/test'
import { expect, queues } from '../fixtures/queues'

// Enables a 9v9 queue next to the 6v6 one, so both gamemodes are in use.
const test = queues.extend<{ page9v9: void }>({
  page9v9: [
    async ({ queues }, use) => {
      await queues.create({ template: 'auto-9v9', enable: true })
      await use()
    },
    { auto: true },
  ],
})

async function openToolbox(page: Page, steamId: string) {
  await page.goto(`/players/${steamId}`)
  const summary = page.locator('#player-admin-toolbox summary')
  if (!(await page.locator('#player-admin-toolbox .player-admin-toolbox').isVisible())) {
    await summary.click()
  }
}

async function resetSkill(page: Page, steamId: string, gamemode: string) {
  const response = page.waitForResponse(
    response =>
      response.url().endsWith(`/players/${steamId}/edit/skill?gamemode=${gamemode}`) &&
      response.request().method() === 'DELETE',
  )
  // the confirm blocks the click until it's answered
  page.once('dialog', dialog => void dialog.accept())
  await page.waitForFunction(() => 'htmx' in window)
  await skillForm(page, gamemode).getByRole('button', { name: 'Reset' }).click()
  expect((await response).ok()).toBe(true)
  await openToolbox(page, steamId)
}

function skillForm(page: Page, gamemode: string) {
  return page.locator('form', { has: page.getByLabel(`Player's ${gamemode} skill on medic`) })
}

test("the admin toolbox edits each gamemode's skill @multi-queue", async ({ users }) => {
  const player = users.byName('LlamaDrama')
  const page = await users.getAdmin().page()
  await openToolbox(page, player.steamId)

  const sixesScout = page.getByLabel("Player's 6v6 skill on scout")
  const before = await sixesScout.inputValue()

  await page.getByLabel("Player's 9v9 skill on sniper").fill('7')
  await skillForm(page, '9v9').getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Player skill updated')).toBeVisible()

  await openToolbox(page, player.steamId)
  await expect(page.getByLabel("Player's 9v9 skill on sniper")).toHaveValue('7')
  await expect(sixesScout).toHaveValue(before)

  await resetSkill(page, player.steamId, '9v9')
  await expect(page.getByText('This player has no 9v9 skill assigned')).toBeVisible()
  await expect(page.getByLabel("Player's 6v6 skill on scout")).toHaveValue(before)
})

test('skills are exported and imported per gamemode @multi-queue', async ({ users }) => {
  const player = users.byName('LlamaDrama')
  const page = await users.getAdmin().page()
  await page.goto('/admin/skill-import-export')
  await page
    .getByRole('navigation', { name: 'Gamemodes' })
    .getByRole('link', { name: '9v9' })
    .click()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('link', { name: 'Download CSV' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^player-skills-9v9-/)
  const [header] = (await readFile(await download.path(), 'utf-8')).split('\n')
  expect(header).toBe('steamId,name,scout,soldier,pyro,demoman,heavy,engineer,medic,sniper,spy')

  const csv = resolve(tmpdir(), `skills-9v9-${Date.now()}.csv`)
  await writeFile(csv, `steamId,name,sniper,spy\n${player.steamId},${player.playerName},6,4`)
  try {
    await page.locator('input[type="file"]').setInputFiles(csv)
    await page.getByRole('button', { name: 'Upload and preview' }).click()
    await expect(page.getByText('9v9 skill', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: /Apply \d+ change/ }).click()
    await expect(page.getByText(/Successfully applied/)).toBeVisible()
  } finally {
    await unlink(csv)
  }

  await openToolbox(page, player.steamId)
  await expect(page.getByLabel("Player's 9v9 skill on sniper")).toHaveValue('6')
  await expect(page.getByLabel("Player's 9v9 skill on spy")).toHaveValue('4')

  await resetSkill(page, player.steamId, '9v9')
  await expect(page.getByText('This player has no 9v9 skill assigned')).toBeVisible()
})

test('the elo page switches between gamemodes @multi-queue', async ({ users }) => {
  const page = await users.getAdmin().page()
  await page.goto(`/players/${users.byName('LlamaDrama').steamId}/edit/elo`)
  const gamemodes = page.getByRole('navigation', { name: 'Gamemodes' })
  await expect(gamemodes.getByRole('link', { name: '6v6' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('row', { name: /sniper/ })).toHaveCount(0)

  await gamemodes.getByRole('link', { name: '9v9' }).click()
  await expect(gamemodes.getByRole('link', { name: '9v9' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('row', { name: /sniper/ })).toHaveCount(1)
})

test('the default skill has a row for each gamemode in use @multi-queue', async ({ users }) => {
  const page = await users.getAdmin().page()
  await page.goto('/admin/player-restrictions')
  await expect(page.getByLabel('Default 6v6 skill on scout')).toBeVisible()
  await expect(page.getByLabel('Default 9v9 skill on sniper')).toBeVisible()

  await page.goto('/admin/games')
  await expect(page.getByLabel('6v6 whitelist ID')).toBeVisible()
  await expect(page.getByLabel('9v9 whitelist ID')).toBeVisible()
})
