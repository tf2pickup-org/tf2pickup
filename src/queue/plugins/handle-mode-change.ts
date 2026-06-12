import fp from 'fastify-plugin'
import { configuration } from '../../configuration'
import { collections } from '../../database/collections'
import { QueueState } from '../../database/models/queue-state.model'
import { events } from '../../events'
import { logger } from '../../logger'
import { preReady } from '../../pre-ready'
import { safe } from '../../utils/safe'
import { setState } from '../set-state'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    events.on(
      'queue/mode:changed',
      // eslint-disable-next-line @typescript-eslint/require-await
      safe(async () => {
        app.gateway
          .to({ url: '/' })
          .send(
            () =>
              '<div id="queue-notify-container" hx-swap-oob="beforeend"><div data-queue-mode-changed="true"></div></div>',
          )
      }),
    )

    events.on(
      'configuration:updated',
      safe(async ({ key }) => {
        if (key !== 'queue.mode') return

        logger.info('queue mode changed, resetting queue')

        const [autoPlayers, captainPlayers] = await Promise.all([
          collections.queueSlots.find({ player: { $ne: null } }).toArray(),
          collections.queuePlayers.find({}).toArray(),
        ])

        const allSteamIds = [
          ...autoPlayers.map(s => s.player!.steamId),
          ...captainPlayers.map(p => p.steamId),
        ]

        await Promise.all([
          collections.queueSlots.updateMany({}, { $set: { player: null, ready: false } }),
          collections.queuePlayers.deleteMany({}),
          collections.captainDraft.deleteMany({}),
          collections.queueMapVotes.deleteMany({}),
          ...allSteamIds.map(id => preReady.cancel(id)),
        ])

        await setState(QueueState.waiting)

        for (const steamId of allSteamIds) {
          events.emit('queue:playerKicked', { player: steamId })
        }

        const newMode = await configuration.get('queue.mode')
        events.emit('queue/mode:changed', { mode: newMode })

        logger.info({ kicked: allSteamIds.length }, 'queue reset after mode change')
      }),
    )
  },
  { name: 'handle queue mode change' },
)
