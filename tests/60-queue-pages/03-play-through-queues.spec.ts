import { mergeTests } from '@playwright/test'
import { expect, launchGame } from '../fixtures/launch-game'
import { queues } from '../fixtures/queues'
import { GamePage } from '../pages/game.page'
import { defaultQueueSlug, queueSlots } from '../queue-slots'

for (const gamemode of ['ultiduo', 'bball']) {
  const test = mergeTests(launchGame, queues).extend({
    queue: async ({ queues }, use) => {
      const { slug } = await queues.create({ template: `auto-${gamemode}`, enable: true })
      await use({ slug, gamemode })
    },
  })

  test.describe(`${gamemode} queue`, () => {
    test.use({ waitForStage: 'started' })

    test(`plays a ${gamemode} game @multi-queue`, async ({
      gameNumber,
      gameServer,
      players,
      desiredSlots,
      queue,
      page,
      request,
    }) => {
      const game = (await (await request.get(`/api/v1/games/${gameNumber}`)).json()) as {
        gamemode: string
      }
      expect(game.gamemode).toBe(gamemode)
      await expect(gameServer).toHaveCommand(`exec etf2l_${gamemode}`)

      const sixes = await players[0]!.queuePage(defaultQueueSlug())
      await sixes.goto()
      for (const slot of queueSlots()) {
        await expect(sixes.slot(slot).joinButton()).toBeDisabled()
      }

      const [name, slot] = [...desiredSlots.entries()][0]!
      const player = players.find(p => p.playerName === name)!
      const gameClass = slot.split('-')[0]!
      // the profile prefixes class counts with the gamemode only once the player played two
      const classCount = page.getByLabel(
        new RegExp(`^(${gamemode} g|G)ames played as ${gameClass}$`),
      )
      const totalCount = page
        .getByText('Total games played:')
        .locator('xpath=following-sibling::span[1]')
      await page.goto(`/players/${player.steamId}`)
      const totalBefore = Number(await totalCount.innerText())
      const classBefore = (await page
        .getByLabel(`${gamemode} games played as ${gameClass}`)
        .isVisible())
        ? Number(await page.getByLabel(`${gamemode} games played as ${gameClass}`).innerText())
        : 0

      await gameServer.matchEnds()
      const gamePage = new GamePage(page, gameNumber)
      await gamePage.goto()
      await expect(gamePage.gameEvent('Game ended')).toBeVisible()

      await expect(async () => {
        await page.goto(`/players/${player.steamId}`)
        await expect(classCount).toHaveText(String(classBefore + 1))
        await expect(totalCount).toHaveText(String(totalBefore + 1))
      }).toPass()

      const duo = await player.queuePage(queue!.slug)
      await duo.goto()
      await expect(duo.slot(slot).joinButton()).toBeEnabled()
    })
  })
}
