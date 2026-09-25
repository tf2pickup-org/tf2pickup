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
import { getDefault } from '../../get-default'
import type { QueueId, QueueModel } from '../../../database/models/queue.model'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    // ponytail: `/` shows the default queue, the only one reachable; queue pages get their own
    // rooms once every queue has its own URL
    async function shownQueue(queue: QueueId): Promise<QueueModel | undefined> {
      const shown = await getDefault()
      return shown._id.equals(queue) ? shown : undefined
    }

    async function syncAllSlots(...clients: SteamId64[]) {
      const queue = await getDefault()
      const [slots, actorMap] = await Promise.all([
        collections.queueSlots.find({ queue: queue._id }).toArray(),
        fetchActorMap(clients),
      ])
      for (const client of clients) {
        const actor = actorMap.get(client)
        if (!actor) {
          throw errors.notFound(`Player with steamId ${client} does not exist`)
        }

        app.gateway
          .to({ players: [actor.steamId] })
          .to({ url: '/' })
          .send(() =>
            Promise.all(slots.map(slot => QueueSlot({ queue, slot, actor }))).then(arr =>
              arr.join(),
            ),
          )
      }
    }

    async function syncQueuePage(socket: AppWebSocket) {
      const queue = await getDefault()
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
      slots.forEach(async slot => {
        socket.send(await QueueSlot({ queue, slot, actor }))
      })
      socket.send(await IsInQueue({ queue: queue._id, actor: socket.player?.steamId }))
      socket.send(await SubstitutionRequests())
      socket.send(await CurrentPlayerCount({ queue: queue._id }))
      socket.send(await SetTitle({ queue: queue._id }))
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

        if ((await getState(queue._id)) === QueueState.ready) {
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
    }

    app.gateway.on('ready', async socket => {
      if (socket.currentUrl !== '/') {
        return
      }

      await syncQueuePage(socket)
    })

    app.gateway.on('navigated', async (socket, url) => {
      if (url !== '/') {
        return
      }

      await syncQueuePage(socket)
    })

    const updateOnlinePlayers = debounce(
      safe(async () => {
        const [opl, opc] = await Promise.all([OnlinePlayerList(), OnlinePlayerCount()])
        app.gateway.to({ url: '/' }).send(() => [opl, opc])
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
          .to({ url: '/' })
          .send(() => cmp)
        await syncAllSlots(steamId)
      }),
    )

    events.on('player/preReady:updated', ({ steamId, preReadyUntil }) => {
      app.gateway
        .to({ player: steamId })
        .to({ url: '/' })
        .send(() => PreReadyUpButton({ actor: steamId, preReadyUntil }))
    })

    events.on('queue:playerKicked', async ({ player }) => {
      const close = await ReadyUpDialog.close()
      app.gateway.to({ player }).send(() => close)
    })

    events.on(
      'queue/slots:updated',
      safe(async ({ queue: queueId, slots }) => {
        const queue = await shownQueue(queueId)
        if (!queue) {
          return
        }

        const connectedPlayers = [...(app.websocketServer.clients as Set<AppWebSocket>)]
          .map(c => c.player?.steamId)
          .filter((id): id is SteamId64 => id !== undefined)

        const [playerCount, actorMap] = await Promise.all([
          CurrentPlayerCount({ queue: queueId }),
          fetchActorMap(connectedPlayers),
        ])

        app.gateway.broadcast(player => {
          const actor = player ? actorMap.get(player) : undefined
          return Promise.all(slots.map(slot => QueueSlot({ queue, slot, actor }))).then(items => [
            ...items,
            playerCount,
          ])
        })

        app.gateway.broadcast(() => SetTitle({ queue: queueId }))
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
        if (!(await shownQueue(queue))) {
          return
        }
        app.gateway.to({ url: '/' }).send(actor => MapVote({ queue, actor }))
      }),
    )

    events.on(
      'queue/mapVoteResults:updated',
      safe(async ({ queue, results }) => {
        if (!(await shownQueue(queue))) {
          return
        }
        const mapOptions = await collections.queueMapOptions.find({ queue }).toArray()
        for (const map of mapOptions.map(option => option.name)) {
          app.gateway.to({ url: '/' }).send(() => MapResult({ results, map }))
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
        const queue = await shownQueue(queueId)
        const slot = await collections.queueSlots.findOne({
          queue: queueId,
          'player.steamId': target,
        })
        if (!queue || !slot) {
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
          .send(actor => QueueSlot({ queue, slot, actor: actorMap.get(actor!) }))
      }),
    )

    events.on(
      'queue/friendship:updated',
      safe(async ({ queue: queueId, target }) => {
        const queue = await shownQueue(queueId)
        if (!queue) {
          return
        }
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
            .send(actor => QueueSlot({ queue, slot, actor: actorMap.get(actor!) }))
        }
      }),
    )

    events.on(
      'queue/friendship:removed',
      safe(async ({ queue: queueId, target }) => {
        const queue = await shownQueue(queueId)
        const slot = await collections.queueSlots.findOne({
          queue: queueId,
          'player.steamId': target,
        })
        if (!queue || !slot) {
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
          .send(actor => QueueSlot({ queue, slot, actor: actorMap.get(actor!) }))
      }),
    )

    const refreshSubstitutionRequests = async () => {
      const cmp = await SubstitutionRequests()
      app.gateway.to({ url: '/' }).send(() => cmp)
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
        app.gateway.to({ url: '/' }).send(() => cmp)
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

    events.on('chat:messageSent', ({ message, previousMessage }) => {
      app.gateway
        .to({ authenticated: true })
        .to({ url: '/' })
        .send(() =>
          ChatMessages.append({
            message,
            previousMessageAt: previousMessage?.at,
          }),
        )
    })

    events.on('chat:messageDeleted', ({ messageId }) => {
      app.gateway
        .to({ authenticated: true })
        .to({ url: '/' })
        .send(() => ChatMessages.remove(messageId))
    })
  },
  { name: 'update clients' },
)
