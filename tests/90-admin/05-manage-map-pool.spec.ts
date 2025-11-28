import { authUsers, expect } from '../fixtures/auth-users'
import type { Locator, Page } from '@playwright/test'

type MapEntry = {
  name: string
  execConfig: string
}

authUsers('manage map pool via the admin panel', async ({ users }) => {
  const adminPage = await users.getAdmin().page()
  await adminPage.goto('/admin/map-pool')
  await adminPage.waitForLoadState('domcontentloaded')
  await expect(adminPage.getByRole('heading', { name: 'Map pool' })).toBeVisible()

  const mapRows = adminPage.locator('#mapPoolList tr')
  const originalEntries = await readMapEntries(mapRows)
  expect(originalEntries.length).toBeGreaterThanOrEqual(3)

  const firstEntry = originalEntries[0]!
  const updatedEntry: MapEntry = {
    name: `${firstEntry.name}-updated`,
    execConfig: `${(firstEntry.execConfig || 'etf2l_6v6_5cp')}-updated`,
  }

  const newEntryBaseName = 'cp_admin_panel_rc1'
  const newEntryName = originalEntries.some(entry => entry.name === newEntryBaseName)
    ? `${newEntryBaseName}_${Date.now()}`
    : newEntryBaseName
  const newEntry: MapEntry = {
    name: newEntryName,
    execConfig: 'etf2l_admin_tests',
  }

  const removedEntry = originalEntries.at(-1)!

  let testFailed = true
  try {
    await fillRow(mapRows.first(), updatedEntry)

    await addNewMapRow(adminPage, mapRows, originalEntries.length, newEntry)

    await removeRow(mapRows.nth(originalEntries.length - 1))
    await expect(mapRows).toHaveCount(originalEntries.length)

    await saveMapPool(adminPage)

    await validateMapPoolState(mapRows, { updatedEntry, newEntry, removedEntry })

    await adminPage.reload()
    await adminPage.waitForLoadState('domcontentloaded')
    await validateMapPoolState(mapRows, { updatedEntry, newEntry, removedEntry })

    testFailed = false
  } finally {
    await ensureMapPoolRestored(adminPage, originalEntries, testFailed)
  }
})

async function readMapEntries(mapRows: Locator): Promise<MapEntry[]> {
  return await mapRows.evaluateAll(rows =>
    rows.map(row => {
      const name = (row.querySelector<HTMLInputElement>('input[name="name[]"]')?.value ?? '').trim()
      const execConfig = (
        row.querySelector<HTMLInputElement>('input[name="execConfig[]"]')?.value ?? ''
      ).trim()
      return { name, execConfig }
    }),
  )
}

async function fillRow(row: Locator, entry: MapEntry) {
  await row.locator('input[name="name[]"]').fill(entry.name)
  await row.locator('input[name="execConfig[]"]').fill(entry.execConfig)
}

async function addNewMapRow(page: Page, mapRows: Locator, initialCount: number, entry: MapEntry) {
  await page.getByRole('button', { name: 'Add map' }).click()
  await expect(mapRows).toHaveCount(initialCount + 1)
  const newRow = mapRows.nth(initialCount)
  await expect(newRow.locator('input[name="name[]"]')).toHaveValue('')
  await expect(newRow.locator('input[name="execConfig[]"]')).toHaveValue('')
  await fillRow(newRow, entry)
}

async function removeRow(row: Locator) {
  await row.locator('button').click()
}

async function saveMapPool(page: Page) {
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Configuration saved')).toBeVisible()
}

async function validateMapPoolState(
  mapRows: Locator,
  entries: { updatedEntry: MapEntry; newEntry: MapEntry; removedEntry: MapEntry },
) {
  const currentEntries = await readMapEntries(mapRows)
  expect(currentEntries).toContainEqual(entries.updatedEntry)
  expect(currentEntries).toContainEqual(entries.newEntry)
  expect(currentEntries.map(entry => entry.name)).not.toContain(entries.removedEntry.name)
}

// Keep the shared test database clean even if assertions fail.
async function ensureMapPoolRestored(page: Page, entries: MapEntry[], testFailed: boolean) {
  try {
    await restoreMapPool(page, entries)
  } catch (error) {
    if (!testFailed) {
      throw error
    }
    console.error('Failed to restore original map pool after test failure', error)
  }
}

async function restoreMapPool(page: Page, entries: MapEntry[]) {
  await page.goto('/admin/map-pool')
  await page.waitForLoadState('domcontentloaded')
  const mapRows = page.locator('#mapPoolList tr')
  await syncRowCount(page, mapRows, entries.length)
  for (let i = 0; i < entries.length; ++i) {
    await fillRow(mapRows.nth(i), entries[i]!)
  }
  await saveMapPool(page)
  await expect(mapRows).toHaveCount(entries.length)
}

async function syncRowCount(page: Page, mapRows: Locator, desiredCount: number) {
  const addButton = page.getByRole('button', { name: 'Add map' })
  let currentCount = await mapRows.count()

  while (currentCount > desiredCount) {
    await mapRows.nth(currentCount - 1).locator('button').click()
    currentCount -= 1
    await expect(mapRows).toHaveCount(currentCount)
  }

  while (currentCount < desiredCount) {
    await addButton.click()
    currentCount += 1
    await expect(mapRows).toHaveCount(currentCount)
  }
}
