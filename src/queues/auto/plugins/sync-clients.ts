import fp from 'fastify-plugin'
import { debounce } from 'es-toolkit'
import { events } from '../../../events'
import { safe } from '../../../utils/safe'
import { collections } from '../../../database/collections'
import { ReadyUpDialog } from '../views/html/ready-up-dialog'
import { QueueState } from '../../../database/models/queue-state.model'
import { SubstitutionRequests } from '../views/html/substitution-requests'
import { queuePage } from '../../page'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import type { QueueId } from '../../../database/models/queue.model'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    app.gateway.on(
      'ready',
      safe(async socket => {
        await queuePage.render(socket)
      }),
    )
    app.gateway.on(
      'navigated',
      safe(async (socket, _url, previousUrl) => {
        await queuePage.render(socket, previousUrl)
      }),
    )

    const updateOnlinePlayers = debounce(
      safe(async () => {
        await queuePage.updateAll(app.gateway, { onlinePlayers: true })
      }),
      300,
    )
    events.on('player:connected', updateOnlinePlayers)
    events.on('player:disconnected', updateOnlinePlayers)

    events.on(
      'player/activeGame:updated',
      safe(async ({ steamId }) => {
        await queuePage.updateAll(
          app.gateway,
          { runningGame: true, slots: 'all' },
          { players: [steamId] },
        )
      }),
    )

    events.on(
      'player/preReady:updated',
      safe(async ({ steamId }) => {
        await queuePage.updateAll(app.gateway, { preReady: true }, { players: [steamId] })
      }),
    )

    const updateBans = safe(async ({ player }: { player: SteamId64 }) => {
      await queuePage.updateAll(
        app.gateway,
        { banAlerts: true, slots: 'all' },
        { players: [player] },
      )
    })
    events.on('player/ban:added', updateBans)
    events.on('player/ban:revoked', updateBans)

    events.on('queue:playerKicked', async ({ player }) => {
      const close = await ReadyUpDialog.close()
      app.gateway.to({ player }).send(() => close)
    })

    events.on(
      'queue/slots:updated',
      safe(async ({ queue, slots }) => {
        await queuePage.update(app.gateway, queue, { slots, counts: true })
      }),
    )

    events.on(
      'queue/state:updated',
      safe(async ({ queue, state }) => {
        if (state === QueueState.ready) {
          const players = (
            await collections.queueSlots
              .find({ queue, player: { $ne: null }, ready: { $eq: false } })
              .toArray()
          ).map(s => s.player!.steamId)

          app.gateway.to({ players }).send(actor => ReadyUpDialog.show(actor!))
        }
      }),
    )

    events.on(
      'queue/mapOptions:reset',
      safe(async ({ queue }) => {
        await queuePage.update(app.gateway, queue, { mapVote: true })
      }),
    )

    events.on(
      'queue/mapVoteResults:updated',
      safe(async ({ queue, results }) => {
        await queuePage.update(app.gateway, queue, { mapResults: results })
      }),
    )

    const updateFriends = safe(async ({ queue, target }: { queue: QueueId; target: SteamId64 }) => {
      await queuePage.update(app.gateway, queue, { friends: [target] })
    })
    events.on('queue/friendship:created', updateFriends)
    events.on('queue/friendship:removed', updateFriends)
    events.on(
      'queue/friendship:updated',
      safe(async ({ queue, target }) => {
        await queuePage.update(app.gateway, queue, { friends: [target.before, target.after] })
      }),
    )

    const updateSubstitutionRequests = safe(async () => {
      await queuePage.updateAll(app.gateway, { substitutionRequests: true })
    })
    events.on('game:substituteRequested', ({ game, replacee }) => {
      updateSubstitutionRequests()
      app.gateway.broadcast(actor => SubstitutionRequests.notify({ game, replacee, actor }))
    })
    events.on('game:playerReplaced', updateSubstitutionRequests)
    events.on('game:ended', updateSubstitutionRequests)

    events.on(
      'twitch.tv/streams:updated',
      safe(async () => {
        await queuePage.updateAll(app.gateway, { streams: true })
      }),
    )

    events.on(
      'chat:messageSent',
      safe(async ({ message, previousMessage }) => {
        await queuePage.updateAll(app.gateway, {
          chat: { append: message, previousMessageAt: previousMessage?.at },
        })
      }),
    )

    events.on(
      'chat:messageDeleted',
      safe(async ({ messageId }) => {
        await queuePage.updateAll(app.gateway, { chat: { remove: messageId } })
      }),
    )
  },
  { name: 'update clients' },
)
