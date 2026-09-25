import fp from 'fastify-plugin'
import { debounce } from 'es-toolkit'
import { events } from '../../../events'
import { OnlinePlayerList } from '../views/html/online-player-list'
import { safe } from '../../../utils/safe'
import { QueueSlot } from '../views/html/queue-slot'
import { collections } from '../../../database/collections'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { ReadyUpDialog } from '../views/html/ready-up-dialog'
import { QueueState } from '../../../database/models/queue-state.model'
import { MapResult, MapVote } from '../views/html/map-vote'
import { SetTitle } from '../views/html/set-title'
import { SubstitutionRequests } from '../views/html/substitution-requests'
import { RunningGameSnackbar } from '../views/html/running-game-snackbar'
import { StreamList } from '../views/html/stream-list'
import { BanAlerts } from '../views/html/ban-alerts'
import { CurrentPlayerCount } from '../views/html/current-player-count'
import { PreReadyUpButton } from '../../../pre-ready/views/html/pre-ready-up-button'
import { OnlinePlayerCount } from '../views/html/online-player-count'
import { ChatMessages } from '../views/html/chat'
import { IsInQueue } from '../views/html/is-in-queue'
import type { PlayerModel } from '../../../database/models/player.model'
import type { AppWebSocket } from '../../../websocket/types'
import { players } from '../../../players'
import { errors } from '../../../errors'
import { getState } from '../../get-state'
import type { QueueModel } from '../../../database/models/queue.model'
import { queues } from '../..'
import { QueueSwitcherCount } from '../views/html/queue-switcher-count'
import { playerCounts } from '../../player-counts'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    async function syncAllSlots(...clients: SteamId64[]) {
      const actorMap = await fetchActorMap(clients)
      for (const queue of await queues.listEnabled()) {
        const slots = await collections.queueSlots.find({ queue: queue._id }).toArray()
        for (const client of clients) {
          const actor = actorMap.get(client)
          if (!actor) {
            throw errors.notFound(`Player with steamId ${client} does not exist`)
          }

          app.gateway
            .to({ players: [actor.steamId] })
            .to({ url: queues.queuePageUrl(queue.slug) })
            .send(() =>
              Promise.all(slots.map(slot => QueueSlot({ queue, slot, actor }))).then(arr =>
                arr.join(),
              ),
            )
        }
      }
    }

    // what belongs to the queue on the page; the rest of the page is shared by every queue
    async function syncQueue(socket: AppWebSocket, queue: QueueModel) {
      const slots = await collections.queueSlots.find({ queue: queue._id }).toArray()
      const actor = socket.player
        ? await players.bySteamId(socket.player.steamId, [
            'steamId',
            'bans',
            'activeGame',
            'skill',
            'verified',
            'roles',
          ])
        : undefined
      for (const slot of slots) {
        socket.send(await QueueSlot({ queue, slot, actor }))
      }
      socket.send(await IsInQueue({ queue: queue._id, actor: socket.player?.steamId }))
      socket.send(await CurrentPlayerCount({ queue: queue._id }))
      socket.send(await SetTitle({ queue: queue._id }))

      if (socket.player && (await getState(queue._id)) === QueueState.ready) {
        const slot = await collections.queueSlots.findOne({
          queue: queue._id,
          'player.steamId': socket.player.steamId,
          ready: false,
        })
        if (slot) {
          socket.send(await ReadyUpDialog.show(socket.player.steamId))
        }
      }
    }

    async function syncQueuePage(socket: AppWebSocket, queue: QueueModel) {
      await syncQueue(socket, queue)
      socket.send(await SubstitutionRequests())
      socket.send(await OnlinePlayerCount())
      socket.send(await OnlinePlayerList())
      socket.send(await StreamList())

      if (socket.player) {
        const player = await collections.players.findOne<Pick<PlayerModel, 'activeGame'>>(
          { steamId: socket.player.steamId },
          { projection: { activeGame: 1 } },
        )
        socket.send(await ChatMessages())
        socket.send(await RunningGameSnackbar({ gameNumber: player?.activeGame }))
        socket.send(await PreReadyUpButton({ actor: socket.player.steamId }))
        socket.send(await BanAlerts({ actor: socket.player.steamId }))
      }
    }

    app.gateway.on('ready', async socket => {
      const queue = await queues.byPageUrl(socket.currentUrl)
      if (queue) {
        await syncQueuePage(socket, queue)
      }
    })

    app.gateway.on('navigated', async (socket, url, previousUrl) => {
      const queue = await queues.byPageUrl(url)
      if (!queue) {
        return
      }

      // switching queues keeps the shared part of the page
      if (await queues.byPageUrl(previousUrl)) {
        await syncQueue(socket, queue)
      } else {
        await syncQueuePage(socket, queue)
      }
    })

    const updateOnlinePlayers = debounce(
      safe(async () => {
        const [opl, opc] = await Promise.all([OnlinePlayerList(), OnlinePlayerCount()])
        app.gateway.to({ urls: await queues.pageUrls() }).send(() => [opl, opc])
      }),
      300,
    )

    events.on('player:connected', updateOnlinePlayers)
    events.on('player:disconnected', updateOnlinePlayers)

    events.on(
      'player/activeGame:updated',
      safe(async ({ steamId, activeGame }) => {
        const cmp = await RunningGameSnackbar({ gameNumber: activeGame })
        app.gateway
          .to({ player: steamId })
          .to({ urls: await queues.pageUrls() })
          .send(() => cmp)
        await syncAllSlots(steamId)
      }),
    )

    events.on(
      'player/preReady:updated',
      safe(async ({ steamId, preReadyUntil }) => {
        app.gateway
          .to({ player: steamId })
          .to({ urls: await queues.pageUrls() })
          .send(() => PreReadyUpButton({ actor: steamId, preReadyUntil }))
      }),
    )

    events.on('queue:playerKicked', async ({ player }) => {
      const close = await ReadyUpDialog.close()
      app.gateway.to({ player }).send(() => close)
    })

    events.on(
      'queue/slots:updated',
      safe(async ({ queue: queueId, slots }) => {
        const queue = await queues.get(queueId)
        const url = queues.queuePageUrl(queue.slug)
        const connectedPlayers = [...(app.websocketServer.clients as Set<AppWebSocket>)]
          .map(c => c.player?.steamId)
          .filter((id): id is SteamId64 => id !== undefined)

        const [playerCount, actorMap] = await Promise.all([
          CurrentPlayerCount({ queue: queueId }),
          fetchActorMap(connectedPlayers),
        ])

        app.gateway.to({ url }).send(player => {
          const actor = player ? actorMap.get(player) : undefined
          return Promise.all(slots.map(slot => QueueSlot({ queue, slot, actor }))).then(items => [
            ...items,
            playerCount,
          ])
        })

        app.gateway.to({ url }).send(() => SetTitle({ queue: queueId }))

        const { current, required } = await playerCounts(queue)
        const count = await QueueSwitcherCount({ slug: queue.slug, current, required })
        app.gateway.to({ urls: await queues.pageUrls() }).send(() => count)
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
        const { slug } = await queues.get(queue)
        app.gateway.to({ url: queues.queuePageUrl(slug) }).send(actor => MapVote({ queue, actor }))
      }),
    )

    events.on(
      'queue/mapVoteResults:updated',
      safe(async ({ queue, results }) => {
        const { slug } = await queues.get(queue)
        const mapOptions = await collections.queueMapOptions.find({ queue }).toArray()
        for (const map of mapOptions.map(option => option.name)) {
          app.gateway.to({ url: queues.queuePageUrl(slug) }).send(() => MapResult({ results, map }))
        }
      }),
    )

    async function fetchActorMap(recipientIds: SteamId64[]) {
      const actors = await collections.players
        .find<
          Pick<PlayerModel, 'steamId' | 'bans' | 'activeGame' | 'skill' | 'verified' | 'roles'>
        >(
          { steamId: { $in: recipientIds } },
          {
            projection: {
              steamId: 1,
              bans: 1,
              activeGame: 1,
              skill: 1,
              verified: 1,
              roles: 1,
            },
          },
        )
        .toArray()
      return new Map(actors.map(actor => [actor.steamId, actor] as const))
    }

    events.on(
      'queue/friendship:created',
      safe(async ({ queue: queueId, target }) => {
        const queue = await queues.get(queueId)
        const slot = await collections.queueSlots.findOne({
          queue: queueId,
          'player.steamId': target,
        })
        if (!slot) {
          return
        }
        const recipientIds = (
          await collections.queueSlots
            .find({
              queue: queueId,
              'canMakeFriendsWith.0': { $exists: true },
              player: { $ne: null },
            })
            .toArray()
        ).map(({ player }) => player!.steamId)
        const actorMap = await fetchActorMap(recipientIds)
        app.gateway
          .to({ players: recipientIds })
          .to({ url: queues.queuePageUrl(queue.slug) })
          .send(actor => QueueSlot({ queue, slot, actor: actorMap.get(actor!) }))
      }),
    )

    events.on(
      'queue/friendship:updated',
      safe(async ({ queue: queueId, target }) => {
        const queue = await queues.get(queueId)
        const [slots, friendshipSlots] = await Promise.all([
          collections.queueSlots
            .find({ queue: queueId, 'player.steamId': { $in: [target.before, target.after] } })
            .toArray(),
          collections.queueSlots
            .find({
              queue: queueId,
              'canMakeFriendsWith.0': { $exists: true },
              player: { $ne: null },
            })
            .toArray(),
        ])
        const recipients = friendshipSlots.map(({ player }) => player!.steamId)
        const actorMap = await fetchActorMap(recipients)
        for (const slot of slots) {
          app.gateway
            .to({ players: recipients })
            .to({ url: queues.queuePageUrl(queue.slug) })
            .send(actor => QueueSlot({ queue, slot, actor: actorMap.get(actor!) }))
        }
      }),
    )

    events.on(
      'queue/friendship:removed',
      safe(async ({ queue: queueId, target }) => {
        const queue = await queues.get(queueId)
        const slot = await collections.queueSlots.findOne({
          queue: queueId,
          'player.steamId': target,
        })
        if (!slot) {
          return
        }
        const recipientIds = (
          await collections.queueSlots
            .find({
              queue: queueId,
              'canMakeFriendsWith.0': { $exists: true },
              player: { $ne: null },
            })
            .toArray()
        ).map(({ player }) => player!.steamId)
        const actorMap = await fetchActorMap(recipientIds)
        app.gateway
          .to({ players: recipientIds })
          .to({ url: queues.queuePageUrl(queue.slug) })
          .send(actor => QueueSlot({ queue, slot, actor: actorMap.get(actor!) }))
      }),
    )

    const refreshSubstitutionRequests = async () => {
      const cmp = await SubstitutionRequests()
      app.gateway.to({ urls: await queues.pageUrls() }).send(() => cmp)
    }
    events.on('game:substituteRequested', async ({ game, replacee }) => {
      await refreshSubstitutionRequests()
      app.gateway.broadcast(actor => SubstitutionRequests.notify({ game, replacee, actor }))
    })
    events.on('game:playerReplaced', refreshSubstitutionRequests)
    events.on('game:ended', refreshSubstitutionRequests)
    events.on(
      'twitch.tv/streams:updated',
      safe(async () => {
        const cmp = await StreamList()
        app.gateway.to({ urls: await queues.pageUrls() }).send(() => cmp)
      }),
    )

    const refreshBanAlerts = async (player: SteamId64) => {
      const cmp = await BanAlerts({ actor: player })
      app.gateway.to({ players: [player] }).send(() => cmp)

      setImmediate(async () => {
        await syncAllSlots(player)
      })
    }
    events.on(
      'player/ban:added',
      safe(async ({ player }) => {
        await refreshBanAlerts(player)
      }),
    )
    events.on(
      'player/ban:revoked',
      safe(async ({ player }) => {
        await refreshBanAlerts(player)
      }),
    )

    events.on(
      'chat:messageSent',
      safe(async ({ message, previousMessage }) => {
        app.gateway
          .to({ authenticated: true })
          .to({ urls: await queues.pageUrls() })
          .send(() =>
            ChatMessages.append({
              message,
              previousMessageAt: previousMessage?.at,
            }),
          )
      }),
    )

    events.on(
      'chat:messageDeleted',
      safe(async ({ messageId }) => {
        app.gateway
          .to({ authenticated: true })
          .to({ urls: await queues.pageUrls() })
          .send(() => ChatMessages.remove(messageId))
      }),
    )
  },
  { name: 'update clients' },
)
