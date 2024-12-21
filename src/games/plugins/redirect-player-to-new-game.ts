import fp from 'fastify-plugin'
import { events } from '../../events'
import { GoToGame } from '../views/html/go-to-game'

export default fp(
  async app => {
    events.on('player:updated', ({ before, after }) => {
      if (before.activeGame === undefined && after.activeGame !== undefined) {
        app.gateway
          .to({ player: after.steamId })
          .send(async () => await GoToGame(after.activeGame!))
      }
    })
  },
  {
    name: 'redirect player to new game',
  },
)
