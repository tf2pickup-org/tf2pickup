import fp from 'fastify-plugin'
import { events } from '../../events'
import { GoToGame } from '../views/html/go-to-game'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    events.on('player/activeGame:updated', ({ steamId, activeGame }) => {
      if (activeGame !== undefined) {
        app.gateway.to({ player: steamId }).send(async () => await GoToGame(activeGame))
      }
    })
  },
  {
    name: 'redirect player to new game',
  },
)
