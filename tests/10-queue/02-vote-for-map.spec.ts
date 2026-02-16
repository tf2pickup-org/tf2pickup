import { mergeTests } from '@playwright/test'
import { authUsers, expect } from '../fixtures/auth-users'
import { waitForEmptyQueue } from '../fixtures/wait-for-empty-queue'

const test = mergeTests(authUsers, waitForEmptyQueue)

test('vote for map @6v6 @9v9', async ({ users }) => {
  const page = await users.byName('SlitherTuft').queuePage()
  await page.goto()
  const mapBtn = page.voteForMapButton(0)
  expect(await mapBtn.getAttribute('aria-checked')).toBe(null)

  await expect(mapBtn).toContainText(/^0%/)
  await expect(mapBtn).toBeDisabled()

  // join the queue
  await page.joinQueue('scout-1')
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
