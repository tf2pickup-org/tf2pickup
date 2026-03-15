import fp from 'fastify-plugin'
import { events } from '../../events'
import { QueueState } from '../../database/models/queue-state.model'
import { queue } from '../../queue'
import { debounce } from 'es-toolkit'
import { safe } from '../../utils/safe'
import { launchGame } from '../launch-game'
import { GameState } from '../../database/models/game.model'
import { configure } from '../rcon/configure'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    const launchGameDebounced = debounce(safe(launchGame), 100)

    events.on('queue/state:updated', ({ state }) => {
      if (state === QueueState.launching) {
        launchGameDebounced()
      }
    })

    app.addHook('onListen', async () => {
      if ((await queue.getState()) === QueueState.launching) {
        launchGameDebounced()
      }
    })

    events.on('game:ended', ({ game }) => {
      if (game.state === GameState.interrupted) {
        configure.cancel(game.number)
      }
    })
  },
)
