import { users } from '../data'
import { authUsers, expect } from '../fixtures/auth-users'

const user = users[0]

authUsers(user.steamId)('vote for map', async ({ pages }) => {
  const page = pages.get(user.steamId)!
  const mapBtn = page.getByLabel('Vote for map').locator('nth=0')
  expect(await mapBtn.getAttribute('aria-checked')).toBe('false')

  await expect(mapBtn).toContainText(/^0%/)
  await expect(mapBtn).toBeDisabled()

  // join the queue
  await page.getByLabel(`Join queue on slot 0`, { exact: true }).click()
  await expect(mapBtn).not.toBeDisabled()

  await mapBtn.click()
  await expect(mapBtn).toContainText(/^100%/)
  expect(await mapBtn.getAttribute('aria-checked')).toBe('true')

  const secondMapBtn = page.getByLabel('Vote for map').locator('nth=1')
  await expect(secondMapBtn).toContainText(/^0%/)
  await secondMapBtn.click()
  await expect(secondMapBtn).toContainText(/^100%/)
  await expect(mapBtn).toContainText(/^0%/)

  await page.getByRole('button', { name: 'Leave queue' }).click()
  await expect(mapBtn).toBeDisabled()
  await expect(mapBtn).toContainText(/^0%/)
  await expect(secondMapBtn).toContainText(/^0%/)
})
