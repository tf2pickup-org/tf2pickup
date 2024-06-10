import fp from 'fastify-plugin'
import { events } from '../events'
import { QueueState } from '../database/models/queue-state.model'
import { logger } from '../logger'
import { getState } from '../queue/get-state'
import { getSlots } from '../queue/get-slots'
import { create } from './create'

async function launchGame() {
  logger.info('launching game')
  const slots = await getSlots()
  await create(slots, 'cp_badlands')
}

export default fp(
  async () => {
    events.on('queue/state:updated', async ({ state }) => {
      if (state === QueueState.launching) {
        try {
          await launchGame()
        } catch (error) {
          logger.error(error)
        }
      }
    })

    if ((await getState()) === QueueState.launching) {
      await launchGame()
    }
  },
  {
    name: 'launch-new-game',
    encapsulate: true,
  },
)
