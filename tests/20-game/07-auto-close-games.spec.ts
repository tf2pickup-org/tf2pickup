import { expect, launchGame as test } from '../fixtures/launch-game'

test('auto-closes games with too many substitute requests @6v6 @9v9', async ({ gameNumber, users }) => {
  const page = await users.getAdmin().gamePage(gameNumber)
  await page.requestSubstitute('Mayflower')
  await page.requestSubstitute('Polemic')
  await page.requestSubstitute('Shadowhunter')
  await page.requestSubstitute('MoonMan')

  await expect.poll(() => page.isLive()).toBe(false)
  await expect(page.gameEvent('Game interrupted (too many substitute requests)')).toBeVisible()
})
