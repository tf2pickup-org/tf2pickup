import { launchGame as test } from '../fixtures/launch-game'
import { expect } from '../fixtures/expect'

test('event list grows to fit its events on mobile @6v6 @9v9', async ({ gameNumber, users }) => {
  const page = await users.byName('LlamaDrama').gamePage(gameNumber)
  await page.page.setViewportSize({ width: 375, height: 667 })
  await expect(page.gameEvent('Game created')).toBeVisible()

  const list = page.page.getByLabel('Game events')
  const gap = await list.evaluate(el => {
    const last = el.lastElementChild
    if (!last) {
      throw new Error('event list is empty')
    }
    return el.getBoundingClientRect().bottom - last.getBoundingClientRect().bottom
  })
  expect(gap).toBeLessThan(1)
  expect(await list.evaluate(el => el.scrollHeight <= el.clientHeight)).toBe(true)
})
