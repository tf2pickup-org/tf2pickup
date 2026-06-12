import { captainMode, expect } from '../fixtures/captain-mode'

const test = captainMode

// Switches queue back to auto mode after all captain queue tests.
// This must run last in the suite (hence the 99- prefix) so that
// subsequent test groups (90-admin etc.) find the queue in auto mode.
test('restore auto mode after captain queue tests', async ({ users }) => {
  const admin = users.getAdmin()
  const adminPage = await admin.adminPage()
  await adminPage.setQueueMode('auto')
  await expect(adminPage.page.getByText('Configuration saved')).toBeVisible()
})
