import fp from 'fastify-plugin'
import { collections } from '../../../database/collections'
import { QueueState } from '../../../database/models/queue-state.model'
import { logger } from '../../../logger'
import { tasks } from '../../../tasks'
import { get } from '../../get'
import { getState } from '../../get-state'
import { enterState } from '../enter-state'
import { kickFromQueue } from '../kick-from-queue'
import { queueCommand } from '../queue-command'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    tasks.register('queue:readyUpTimeout', async ({ queue }) => {
      await queueCommand('ready-up-timeout', async emit => {
        if ((await getState(queue)) !== QueueState.ready) {
          return
        }

        logger.info({ queue }, 'ready up timeout, kick players that are not ready')
        const unreadyPlayers = (
          await collections.queueSlots
            .find({ queue, player: { $ne: null }, ready: { $eq: false } })
            .toArray()
        ).map(slot => slot.player!.steamId)
        await kickFromQueue(queue, unreadyPlayers, emit)

        const { readyStateTimeout, readyUpTimeout } = await get(queue)
        const nextTimeout = readyStateTimeout - readyUpTimeout
        if (nextTimeout > 0) {
          await tasks.schedule('queue:unready', nextTimeout, { queue })
        } else {
          await enterState(queue, QueueState.waiting, emit)
        }
      })
    })

    tasks.register('queue:unready', async ({ queue }) => {
      await queueCommand('unready-timeout', async emit => {
        if ((await getState(queue)) === QueueState.ready) {
          await enterState(queue, QueueState.waiting, emit)
        }
      })
    })
  },
  { name: 'ready up timeouts' },
)
