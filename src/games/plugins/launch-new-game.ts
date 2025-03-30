import fp from 'fastify-plugin'
import { events } from '../../events'
import { QueueState } from '../../database/models/queue-state.model'
import { logger } from '../../logger'
import { create } from '../create'
import { queue } from '../../queue'
import { debounce } from 'es-toolkit'

const launchGame = debounce(async () => {
  try {
    logger.info('launching game')
    const slots = await queue.getSlots()
    const map = await queue.getMapWinner()
    const friends = await queue.getFriends()
    logger.trace({ slots, map, friends }, 'launchGame()')
    await create(slots, map, friends)
  } catch (error) {
    logger.error(error)
  }
}, 100)

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    events.on('queue/state:updated', ({ state }) => {
      if (state === QueueState.launching) {
        launchGame()
      }
    })

    app.addHook('onListen', async () => {
      if ((await queue.getState()) === QueueState.launching) {
        launchGame()
      }
    })
  },
  {
    name: 'launch new game',
    encapsulate: true,
  },
)
