import fp from 'fastify-plugin'
import { events } from '../../events'
import { safe } from '../../utils/safe'
import { getState } from '../get-state'
import { collections } from '../../database/collections'
import { logger } from '../../logger'
import { QueueState } from '../../database/models/queue-state.model'
import { setState } from '../set-state'
import { kick } from '../kick'
import { unready } from '../unready'
import { configuration } from '../../configuration'
import { MapVoteTiming } from '../../shared/types/map-vote-timing'
import { tasks } from '../../tasks'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    async function maybeUpdateQueueState() {
      const state = await getState()
      const [currentPlayerCount, readyPlayerCount, requiredPlayerCount] = await Promise.all([
        collections.queueSlots.countDocuments({ player: { $ne: null } }),
        collections.queueSlots.countDocuments({ ready: { $eq: true } }),
        collections.queueSlots.countDocuments(),
      ])

      logger.debug(`${currentPlayerCount}/${requiredPlayerCount}`)

      switch (state) {
        case QueueState.waiting: {
          if (currentPlayerCount === requiredPlayerCount) {
            logger.info('queue full, wait for players to ready up')
            await readyUp()
          }

          break
        }

        case QueueState.ready: {
          if (currentPlayerCount === 0) {
            await unreadyQueue()
          } else if (readyPlayerCount === requiredPlayerCount) {
            logger.info('all players ready')
            await tasks.cancelAll('queue:readyUpTimeout')
            await tasks.cancelAll('queue:unready')
            const mapVoteTiming = await configuration.get('queue.map_vote_timing')
            if (mapVoteTiming === MapVoteTiming.postReady) {
              logger.info('transitioning to map_vote state')
              await setState(QueueState.map_vote)
              const timeout = await configuration.get('queue.map_vote_timeout')
              await tasks.schedule('queue:mapVoteTimeout', timeout)
            } else {
              await setState(QueueState.launching)
            }
          }

          break
        }
      }
    }

    async function kickUnreadyPlayers() {
      const unreadyPlayers = (
        await collections.queueSlots
          .find({ player: { $ne: null }, ready: { $eq: false } })
          .toArray()
      ).map(slot => slot.player!.steamId)
      await kick(...unreadyPlayers)
    }

    async function unreadyQueue() {
      logger.info('unready queue')
      await setState(QueueState.waiting)
      await tasks.cancelAll('queue:mapVoteTimeout')
      const allPlayers = (
        await collections.queueSlots.find({ player: { $ne: null } }).toArray()
      ).map(slot => slot.player!.steamId)
      await unready(...allPlayers)
    }

    async function readyUpTimeout() {
      logger.info('ready up timeout, kick players that are not ready')
      await kickUnreadyPlayers()

      const readyStateTimeout = await configuration.get('queue.ready_state_timeout')
      const readyUpTimeout = await configuration.get('queue.ready_up_timeout')

      const nextTimeout = readyStateTimeout - readyUpTimeout

      if (nextTimeout > 0) {
        await tasks.schedule('queue:unready', nextTimeout)
      } else {
        await unreadyQueue()
      }
    }

    async function mapVoteTimeout() {
      logger.info('map vote timeout, resolving winner')
      await setState(QueueState.launching)
    }

    async function readyUp() {
      await setState(QueueState.ready)
      const timeout = await configuration.get('queue.ready_up_timeout')
      await tasks.schedule('queue:readyUpTimeout', timeout)
    }

    tasks.register('queue:readyUpTimeout', readyUpTimeout)
    tasks.register('queue:unready', unreadyQueue)
    tasks.register('queue:mapVoteTimeout', mapVoteTimeout)

    events.on('queue/slots:updated', safe(maybeUpdateQueueState))
  },
  { name: 'auto update queue state' },
)
