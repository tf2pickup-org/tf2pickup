import fp from 'fastify-plugin'
import { configuration } from '../../configuration'
import { collections } from '../../database/collections'
import { QueueState } from '../../database/models/queue-state.model'
import { events } from '../../events'
import { logger } from '../../logger'
import { queue } from '../../queue'
import { QueueMode } from '../../shared/types/queue-mode'
import { tasks } from '../../tasks'
import { safe } from '../../utils/safe'
import { autoPick } from '../draft/auto-pick'
import { start } from '../draft/start'
import { getPool } from '../get-pool'
import { getReadiness } from '../get-readiness'
import { leave } from '../leave'
import { unreadyPool } from '../unready-pool'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    async function maybeUpdateQueueState() {
      if ((await queue.getMode()) !== QueueMode.captains) {
        return
      }

      const state = await queue.getState()
      switch (state) {
        case QueueState.waiting: {
          if ((await getReadiness()).isFull) {
            logger.info('captains queue full, wait for players to ready up')
            await queue.setState(QueueState.ready)
            await tasks.schedule(
              'queueCaptains:readyUpTimeout',
              await configuration.get('queue.ready_up_timeout'),
            )
          }
          break
        }

        case QueueState.ready: {
          const pool = await getPool()
          if (pool.length === 0) {
            await unreadyPool()
          } else if (pool.every(entry => entry.ready)) {
            logger.info('all players ready, starting the draft')
            await tasks.cancelAll('queueCaptains:readyUpTimeout')
            await tasks.cancelAll('queueCaptains:unready')
            await start()
          }
          break
        }
      }
    }

    // Everyone in the pool is a draft candidate, so everyone has to ready up — there are no
    // passive reserves. Whoever did not is dropped, and if enough remain the draft goes ahead
    // with a smaller pool rather than making the rest queue again.
    async function readyUpTimeout() {
      logger.info('captains ready up timeout, dropping players that are not ready')
      const unready = (await collections.queueCaptainsPool.find({ ready: false }).toArray()).map(
        entry => entry.player.steamId,
      )
      for (const steamId of unready) {
        await leave(steamId)
      }

      if ((await getReadiness()).isFull) {
        logger.info('still full after dropping unready players, starting the draft')
        await start()
        return
      }

      const readyStateTimeout = await configuration.get('queue.ready_state_timeout')
      const readyUpTimeoutMs = await configuration.get('queue.ready_up_timeout')
      const nextTimeout = readyStateTimeout - readyUpTimeoutMs
      if (nextTimeout > 0) {
        await tasks.schedule('queueCaptains:unready', nextTimeout)
      } else {
        await unreadyPool()
      }
    }

    tasks.register('queueCaptains:readyUpTimeout', safe(readyUpTimeout))
    tasks.register('queueCaptains:unready', safe(unreadyPool))
    tasks.register(
      'queueCaptains:draftTurnTimeout',
      safe(async ({ draftId, turn }) => {
        await autoPick(draftId, turn)
      }),
    )

    events.on('queueCaptains/pool:updated', safe(maybeUpdateQueueState))
    events.on('queueCaptains/pool:left', safe(maybeUpdateQueueState))
  },
  { name: 'auto update captains queue state' },
)
