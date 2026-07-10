import fp from 'fastify-plugin'
import { events } from '../../events'
import { safe } from '../../utils/safe'
import { getState } from '../../queue/get-state'
import { collections } from '../../database/collections'
import { logger } from '../../logger'
import { QueueState } from '../../database/models/queue-state.model'
import { setState } from '../../queue/set-state'
import { kick } from '../kick'
import { unready } from '../unready'
import { configuration } from '../../configuration'
import { tasks } from '../../tasks'
import type { Gamemode } from '../../shared/types/gamemode'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    async function maybeUpdateQueueState(gamemode: Gamemode) {
      const state = await getState(gamemode)
      const [currentPlayerCount, readyPlayerCount, requiredPlayerCount] = await Promise.all([
        collections.queueSlots.countDocuments({ gamemode, player: { $ne: null } }),
        collections.queueSlots.countDocuments({ gamemode, ready: { $eq: true } }),
        collections.queueSlots.countDocuments({ gamemode }),
      ])

      logger.debug(`${gamemode}: ${currentPlayerCount}/${requiredPlayerCount}`)

      switch (state) {
        case QueueState.waiting: {
          if (currentPlayerCount === requiredPlayerCount) {
            logger.info({ gamemode }, 'queue full, wait for players to ready up')
            await readyUp(gamemode)
          }

          break
        }

        case QueueState.ready: {
          if (currentPlayerCount === 0) {
            await unreadyQueue({ gamemode })
          } else if (readyPlayerCount === requiredPlayerCount) {
            logger.info({ gamemode }, 'all players ready, queue ready')
            await setState(gamemode, QueueState.launching)
            await tasks.cancel('queue:readyUpTimeout', { gamemode })
            await tasks.cancel('queue:unready', { gamemode })
          }

          break
        }
      }
    }

    async function kickUnreadyPlayers(gamemode: Gamemode) {
      const unreadyPlayers = (
        await collections.queueSlots
          .find({ gamemode, player: { $ne: null }, ready: { $eq: false } })
          .toArray()
      ).map(slot => slot.player!.steamId)
      await kick(...unreadyPlayers)
    }

    async function unreadyQueue({ gamemode }: { gamemode: Gamemode }) {
      logger.info({ gamemode }, 'unready queue')
      await setState(gamemode, QueueState.waiting)
      const allPlayers = (
        await collections.queueSlots.find({ gamemode, player: { $ne: null } }).toArray()
      ).map(slot => slot.player!.steamId)
      await unready(...allPlayers)
    }

    async function readyUpTimeout({ gamemode }: { gamemode: Gamemode }) {
      logger.info({ gamemode }, 'ready up timeout, kick players that are not ready')
      await kickUnreadyPlayers(gamemode)

      const readyStateTimeout = await configuration.get('queue.ready_state_timeout')
      const readyUpTimeout = await configuration.get('queue.ready_up_timeout')

      const nextTimeout = readyStateTimeout - readyUpTimeout

      if (nextTimeout > 0) {
        await tasks.schedule('queue:unready', nextTimeout, { gamemode })
      } else {
        await unreadyQueue({ gamemode })
      }
    }

    async function readyUp(gamemode: Gamemode) {
      await setState(gamemode, QueueState.ready)
      const timeout = await configuration.get('queue.ready_up_timeout')
      await tasks.schedule('queue:readyUpTimeout', timeout, { gamemode })
    }

    tasks.register('queue:readyUpTimeout', readyUpTimeout)
    tasks.register('queue:unready', unreadyQueue)

    events.on(
      'queue/slots:updated',
      safe(({ gamemode }) => maybeUpdateQueueState(gamemode)),
    )
  },
  { name: 'auto update queue state' },
)
