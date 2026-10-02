// How an admin does things on tf2pickup 4.23.13. Frozen: the before-specs run against that version,
// so these must not follow later UI changes.
import { expect, type Page } from '@playwright/test'

export async function configurePlayerSkillThreshold(page: Page, threshold: number) {
  await page.goto('/admin/player-restrictions')
  await page.getByLabel('Player skill threshold', { exact: true }).setChecked(true)
  await page.getByLabel('Player skill threshold value', { exact: true }).fill(threshold.toString())
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Configuration saved')).toBeVisible()
}

export async function configureRequirePlayerVerification(page: Page) {
  await page.goto('/admin/player-restrictions')
  await page.getByLabel('Require player verification').setChecked(true, { force: true })
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Configuration saved')).toBeVisible()
}

export async function configureDefaultMedicSkill(page: Page, skill: number) {
  await page.goto('/admin/player-restrictions')
  await page.getByLabel("Player's skill on medic").fill(skill.toString())
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Configuration saved')).toBeVisible()
}

export async function setMapPool(page: Page, maps: { name: string; execConfig: string }[]) {
  await page.goto('/admin/map-pool')
  const names = page.locator('input[name="name[]"]')
  const configs = page.locator('input[name="execConfig[]"]')
  for (const [i, { name, execConfig }] of maps.entries()) {
    await names.nth(i).fill(name)
    await configs.nth(i).fill(execConfig)
  }
  while ((await names.count()) > maps.length) {
    await page.locator('button[data-remove-closest="tr"]').last().click()
  }
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Configuration saved')).toBeVisible()

  // a new map pool doesn't change the maps already up for vote
  await page.goto('/admin/scramble-maps')
  await page.getByRole('button', { name: 'Scramble' }).click()
  await expect(page.getByText('Maps scrambled')).toBeVisible()
}

export async function updateSkill(page: Page, steamId: string, skill: Record<string, number>) {
  await page.goto(`/players/${steamId}`)
  await page.locator('#player-admin-toolbox summary').click()
  for (const [gameClass, value] of Object.entries(skill)) {
    await page.getByLabel(`Player's skill on ${gameClass}`).fill(value.toString())
  }
  await page.getByRole('button', { name: 'Save' }).click()
  await page.waitForURL(`/players/${steamId}`)
}

export async function setConfiguration(page: Page, key: string, value: unknown) {
  await page.goto('/admin/view-for-nerds')
  const input = page.getByLabel(key, { exact: true })
  await input.fill(JSON.stringify(value))
  await input.press('Enter')
  await expect(page.getByLabel(key, { exact: true })).toHaveValue(JSON.stringify(value))
}
