import fp from 'fastify-plugin'
import { events } from '../events'
import { QueueState as QueueStateCmp } from './views/html/queue-state'
import { QueueSlot } from './views/html/queue-slot'
import { kick } from './kick'
import { maybeUpdateQueueState } from './maybe-update-queue-state'
import { collections } from '../database/collections'
import { ReadyUpDialog } from './views/html/ready-up-dialog'
import { QueueState } from '../database/models/queue-state.model'
import { logger } from '../logger'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { MapResult, MapVote } from './views/html/map-vote'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    events.on('player:disconnected', async ({ steamId }) => {
      try {
        await kick(steamId)
      } catch (error) {
        logger.error(error)
      }
    })

    events.on('queue/slots:updated', async ({ slots }) => {
      try {
        const queueState = await QueueStateCmp()
        app.gateway.broadcast(
          async player =>
            await Promise.all([
              ...slots.map(async slot => await QueueSlot({ slot, actor: player })),
              queueState,
            ]),
        )
      } catch (error) {
        logger.error(error)
      }
    })

    events.on('queue/slots:updated', async () => {
      try {
        await maybeUpdateQueueState()
      } catch (error) {
        logger.error(error)
      }
    })

    events.on('queue/state:updated', async ({ state }) => {
      try {
        if (state === QueueState.ready) {
          const players = (
            await collections.queueSlots
              .find({ player: { $ne: null }, ready: { $eq: false } })
              .toArray()
          )
            .map(s => s.player)
            .filter(Boolean) as SteamId64[]

          const show = await ReadyUpDialog.show()
          app.gateway.toPlayers(...players).broadcast(() => show)
        }
      } catch (error) {
        logger.error(error)
      }
    })

    events.on('queue/mapOptions:reset', () => {
      try {
        app.gateway.broadcast(async player => await MapVote({ actor: player }))
      } catch (error) {
        logger.error(error)
      }
    })

    events.on('queue/mapVoteResults:updated', async ({ results }) => {
      try {
        // app.gateway.broadcast(async player => await MapVote({ actor: player }))
        const mapOptions = await collections.queueMapOptions.find().toArray()
        for (const map of mapOptions.map(option => option.name)) {
          app.gateway.broadcast(async () => MapResult({ results, map }))
        }
      } catch (error) {
        logger.error(error)
      }
    })
  },
  { name: 'queue-event-listeners' },
)
