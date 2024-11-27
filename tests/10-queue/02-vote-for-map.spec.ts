import { users } from '../data'
import { authUsers, expect } from '../fixtures/auth-users'

const user = users[0]

authUsers.use({ steamIds: [user.steamId] })
authUsers('vote for map', async ({ users }) => {
  const page = await users.getFirst().queuePage()
  const mapBtn = page.voteForMapButton(0)
  expect(await mapBtn.getAttribute('aria-checked')).toBe('false')

  await expect(mapBtn).toContainText(/^0%/)
  await expect(mapBtn).toBeDisabled()

  // join the queue
  await page.joinQueue(0)
  await expect(mapBtn).not.toBeDisabled()

  await mapBtn.click()
  await expect(mapBtn).toContainText(/^100%/)
  expect(await mapBtn.getAttribute('aria-checked')).toBe('true')

  const secondMapBtn = page.voteForMapButton(1)
  await expect(secondMapBtn).toContainText(/^0%/)
  await secondMapBtn.click()
  await expect(secondMapBtn).toContainText(/^100%/)
  await expect(mapBtn).toContainText(/^0%/)

  await page.leaveQueue()
  await expect(mapBtn).toBeDisabled()
  await expect(mapBtn).toContainText(/^0%/)
  await expect(secondMapBtn).toContainText(/^0%/)
})
