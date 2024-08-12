import { users } from '../data'
import { expect, launchGame } from '../fixtures/launch-game'
import { GamePage } from '../pages/game.page'
import { QueuePage } from '../pages/queue.page'

launchGame(
  'queue is locked for players that are involved in active game',
  async ({ steamIds, gameNumber, pages }) => {
    const queueUsers = steamIds.slice(0, 12)

    await Promise.all(
      queueUsers.map(async steamId => {
        const queuePage = new QueuePage(pages.get(steamId)!)
        await queuePage.goto()
        for (let i = 0; i < 12; ++i) {
          await expect(queuePage.slot(i).joinButton()).toBeDisabled()
        }
      }),
    )

    const adminsPage = new GamePage(pages.get(users[0].steamId)!, gameNumber)
    await adminsPage.goto()
    await adminsPage.forceEnd()
  },
)
