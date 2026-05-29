import fp from 'fastify-plugin'
import { configuration } from '../../configuration'
import { collections } from '../../database/collections'
import { QueueState } from '../../database/models/queue-state.model'
import { environment } from '../../environment'
import { events } from '../../events'
import { logger } from '../../logger'
import { mapPool } from '../../maps/pool'
import { queueConfigs } from '../../queue-auto/configs'
import { getState } from '../../queue/get-state'
import { setState } from '../../queue/set-state'
import { tasks } from '../../tasks'
import { safe } from '../../utils/safe'
import { Tf2Team } from '../../shared/types/tf2-team'
import { canFormTeams } from '../can-form-teams'
import { getPickOrder } from '../get-pick-order'
import { kick } from '../kick'
import { selectCaptains } from '../select-captains'
import { unready } from '../unready'

export default fp(
  async () => {
    let isActive = (await configuration.get('queue.mode')) === 'captain'

    events.on('queue/mode:changed', ({ mode }) => {
      isActive = mode === 'captain'
    })

    async function maybeUpdateQueueState() {
      if (!isActive) return

      const state = await getState()
      const allPlayers = await collections.queuePlayers.find({}).toArray()
      const config = queueConfigs[environment.QUEUE_CONFIG]

      switch (state) {
        case QueueState.waiting: {
          if (canFormTeams(allPlayers, config)) {
            logger.info('captain queue: requirements met, moving to ready-up')
            await setState(QueueState.ready)
            const timeout = await configuration.get('queue.ready_up_timeout')
            await tasks.schedule('captain:readyUpTimeout', timeout)
          }
          break
        }

        case QueueState.ready: {
          const readyCount = allPlayers.filter(p => p.ready).length
          if (allPlayers.length === 0) {
            await goToWaiting()
          } else if (readyCount === allPlayers.length) {
            logger.info('captain queue: all players ready, starting draft')
            await tasks.cancelAll('captain:readyUpTimeout')
            await tasks.cancelAll('captain:unready')
            await startDraft()
          }
          break
        }
      }
    }

    async function startDraft() {
      const captainIds = await selectCaptains()
      if (!captainIds) {
        logger.warn('captain queue: not enough eligible captains, returning to waiting')
        const allIds = (await collections.queuePlayers.find({}).toArray()).map(p => p.steamId)
        await goToWaiting()
        await unready(...allIds)
        return
      }

      const config = queueConfigs[environment.QUEUE_CONFIG]
      const pickOrder = getPickOrder(config)
      const timeout = await configuration.get('queue.captain_pick_timeout')

      const allMaps = await mapPool.get()
      const mapOptions = allMaps
        .filter(m => !m.cooldown || m.cooldown === 0)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(m => m.name)

      await collections.captainDraft.deleteMany({})
      await collections.captainDraft.insertOne({
        captains: { blu: captainIds[0], red: captainIds[1] },
        picks: [],
        mapOptions,
        mapBans: [],
        currentTurn: pickOrder[0]!,
        expiresAt: new Date(Date.now() + timeout),
      })

      await setState(QueueState.draft)
      events.emit('queue/captain:selected', { captains: captainIds })
      await tasks.schedule('captain:pickTimeout', timeout)
    }

    async function pickTimeout() {
      if (!isActive) return
      const state = await getState()
      if (state !== QueueState.draft) return

      const draft = await collections.captainDraft.findOne({})
      if (!draft) return

      const config = queueConfigs[environment.QUEUE_CONFIG]
      const pickOrder = getPickOrder(config)
      const isInPickingPhase = draft.picks.length < pickOrder.length

      if (isInPickingPhase) {
        const timedOutCaptain = draft.captains[draft.currentTurn]
        logger.info({ captain: timedOutCaptain }, 'captain pick timeout')

        events.emit('queue/draft:pickExpired', {
          team: draft.currentTurn,
          captain: timedOutCaptain,
        })

        await collections.captainDraft.deleteMany({})
        await kick(timedOutCaptain)

        const remaining = await collections.queuePlayers.find({}).toArray()
        if (canFormTeams(remaining, config)) {
          logger.info('captain queue: requirements still met after kick, going to ready-up')
          await setState(QueueState.ready)
          const timeout = await configuration.get('queue.ready_up_timeout')
          await tasks.schedule('captain:readyUpTimeout', timeout)
        } else {
          await setState(QueueState.waiting)
        }
      } else {
        await autoBanMap()
      }
    }

    async function autoBanMap() {
      const draft = await collections.captainDraft.findOne({})
      if (!draft) return

      const banTeam: Tf2Team = draft.mapBans.length === 0 ? Tf2Team.blu : Tf2Team.red
      const captain = draft.captains[banTeam]
      const available = draft.mapOptions.filter(m => !draft.mapBans.some(b => b.map === m))
      const autoBan = available[Math.floor(Math.random() * (available.length - 1))]!

      logger.info({ captain, map: autoBan }, 'map ban timeout, auto-banning')

      const updatedBans = [...draft.mapBans, { captain, team: banTeam, map: autoBan }]
      const remaining = draft.mapOptions.filter(m => !updatedBans.some(b => b.map === m))

      if (updatedBans.length >= 2) {
        const selectedMap = remaining[0]!
        await collections.captainDraft.updateOne(
          {},
          { $set: { mapBans: updatedBans, selectedMap } },
        )
        events.emit('queue/draft:completed', { selectedMap })
      } else {
        await collections.captainDraft.updateOne({}, { $set: { mapBans: updatedBans } })
        const timeout = await configuration.get('queue.captain_pick_timeout')
        await tasks.schedule('captain:pickTimeout', timeout)
      }
    }

    async function readyUpTimeout() {
      if (!isActive) return
      logger.info('captain queue: ready-up timeout')

      const unreadyIds = (await collections.queuePlayers.find({ ready: false }).toArray()).map(
        p => p.steamId,
      )
      await kick(...unreadyIds)

      const readyStateTimeout = await configuration.get('queue.ready_state_timeout')
      const readyUpTimeout = await configuration.get('queue.ready_up_timeout')
      const nextTimeout = readyStateTimeout - readyUpTimeout

      if (nextTimeout > 0) {
        await tasks.schedule('captain:unready', nextTimeout)
      } else {
        await goToWaiting()
      }
    }

    async function goToWaiting() {
      await setState(QueueState.waiting)
      const allIds = (await collections.queuePlayers.find({}).toArray()).map(p => p.steamId)
      await unready(...allIds)
    }

    tasks.register('captain:readyUpTimeout', readyUpTimeout)
    tasks.register('captain:unready', goToWaiting)
    tasks.register('captain:pickTimeout', pickTimeout)

    events.on('queue/players:updated', safe(maybeUpdateQueueState))
    events.on(
      'queue/draft:completed',
      safe(async ({ selectedMap }) => {
        if (!isActive) return
        logger.info({ selectedMap }, 'captain draft complete, launching game')
        await setState(QueueState.launching)
      }),
    )
  },
  { name: 'captain update queue state' },
)
