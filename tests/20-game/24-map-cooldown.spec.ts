import { expect, launchGame } from '../fixtures/launch-game'

launchGame(
  'the map that was just played is not an option in the next vote @6v6 @9v9',
  async ({ gameNumber, page, request }) => {
    const { map } = (await (await request.get(`/api/v1/games/${gameNumber}`)).json()) as {
      map: string
    }

    await page.goto('/')
    await expect(page.getByRole('button', { name: /^Vote for map / })).toHaveCount(3)
    await expect(page.getByRole('button', { name: `Vote for map ${map}` })).toHaveCount(0)
  },
)
