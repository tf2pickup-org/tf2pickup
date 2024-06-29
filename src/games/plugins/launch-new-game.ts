import fp from 'fastify-plugin'
import { events } from '../../events'
import { QueueState } from '../../database/models/queue-state.model'
import { logger } from '../../logger'
import { create } from '../create'
import { queue } from '../../queue'

async function launchGame() {
  logger.info('launching game')
  const slots = await queue.getSlots()
  const map = await queue.getMapWinner()
  await create(slots, map)
}

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    events.on('queue/state:updated', async ({ state }) => {
      if (state === QueueState.launching) {
        try {
          await launchGame()
        } catch (error) {
          logger.error(error)
        }
      }
    })

    app.addHook('onListen', async () => {
      if ((await queue.getState()) === QueueState.launching) {
        await launchGame()
      }
    })
  },
  {
    name: 'launch new game',
    encapsulate: true,
  },
)
