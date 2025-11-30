import { authUsers, expect } from '../fixtures/auth-users'
import {
  AdminPanelMapPoolPage,
  type MapPoolFormEntry,
} from '../pages/admin-map-pool.page'

authUsers('manage map pool via the admin panel', async ({ users }) => {
  const admin = await users.getAdmin().page()
  const mapPoolPage = new AdminPanelMapPoolPage(admin)
  await mapPoolPage.goto()

  const originalEntries = await mapPoolPage.entries()
  expect(originalEntries.length).toBeGreaterThanOrEqual(3)

  const firstEntry = originalEntries[0]!
  const updatedEntry: MapPoolFormEntry = {
    name: `${firstEntry.name}-updated`,
    execConfig: `${(firstEntry.execConfig || 'etf2l_6v6_5cp')}-updated`,
  }

  const newEntryBaseName = 'cp_admin_panel_rc1'
  const newEntryName = originalEntries.some(entry => entry.name === newEntryBaseName)
    ? `${newEntryBaseName}_${Date.now()}`
    : newEntryBaseName
  const newEntry: MapPoolFormEntry = {
    name: newEntryName,
    execConfig: 'etf2l_admin_tests',
  }

  const removedEntry = originalEntries.at(-1)!

  let testFailed = true
  try {
    await mapPoolPage.updateEntry(0, updatedEntry)
    await mapPoolPage.addEntry(newEntry)
    await mapPoolPage.removeEntry(originalEntries.length - 1)
    await mapPoolPage.expectEntryCount(originalEntries.length)

    await mapPoolPage.save()

    await mapPoolPage.expectContains(updatedEntry)
    await mapPoolPage.expectContains(newEntry)
    await mapPoolPage.expectMissing(removedEntry.name)

    await mapPoolPage.reload()

    await mapPoolPage.expectContains(updatedEntry)
    await mapPoolPage.expectContains(newEntry)
    await mapPoolPage.expectMissing(removedEntry.name)

    testFailed = false
  } finally {
    await mapPoolPage.ensureRestored(originalEntries, testFailed)
  }
})
