import fp from 'fastify-plugin'
import { tasks } from '../../tasks'
import { setActiveGame } from '../set-active-game'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    tasks.register('games.freePlayer', async ({ player }) => {
      await setActiveGame(player, undefined)
    })
  },
  {
    name: 'free players',
  },
)
