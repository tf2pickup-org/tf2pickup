import fp from 'fastify-plugin'
import { debounce } from 'es-toolkit'
import { events } from '../../events'
import { OnlinePlayerList } from '../views/html/online-player-list'
import { safe } from '../../utils/safe'
import { QueueSlot } from '../views/html/queue-slot'
import { collections } from '../../database/collections'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { ReadyUpDialog } from '../views/html/ready-up-dialog'
import { QueueState } from '../../database/models/queue-state.model'
import { MapResult, MapVote } from '../views/html/map-vote'
import { SetTitle } from '../views/html/set-title'
import { SubstitutionRequests } from '../views/html/substitution-requests'
import { RunningGameSnackbar } from '../views/html/running-game-snackbar'
import { StreamList } from '../views/html/stream-list'
import { BanAlerts } from '../views/html/ban-alerts'
import { CurrentPlayerCount } from '../views/html/current-player-count'
import { PreReadyUpButton } from '../../pre-ready/views/html/pre-ready-up-button'
import { OnlinePlayerCount } from '../views/html/online-player-count'
import { ChatMessages } from '../views/html/chat'
import { IsInQueue } from '../views/html/is-in-queue'
import type { PlayerModel } from '../../database/models/player.model'
import type { AppWebSocket } from '../../websocket/types'
import { players } from '../../players'
import { errors } from '../../errors'
import { enabledGamemodes } from '../../shared/enabled-gamemodes'
import { queuePageGamemode } from '../../shared/queue-page-gamemode'
import type { Gamemode } from '../../shared/types/gamemode'
import { GamemodeQueueGauge } from '../views/html/gamemode-selector'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    async function syncAllSlots(...clients: SteamId64[]) {
      const actorMap = await fetchActorMap(clients)
      for (const gamemode of enabledGamemodes) {
        const slots = await collections.queueSlots.find({ gamemode }).toArray()
        for (const client of clients) {
          const actor = actorMap.get(client)
          if (!actor) {
            throw errors.notFound(`Player with steamId ${client} does not exist`)
          }

          app.gateway
            .to({ players: [actor.steamId] })
            .to({ url: '/' })
            .to({ gamemode })
            .send(() =>
              Promise.all(slots.map(slot => QueueSlot({ slot, actor }))).then(arr => arr.join()),
            )
        }
      }
    }

    async function syncGamemodeGauges(recipients: { gamemode?: Gamemode }) {
      if (enabledGamemodes.length <= 1) {
        return
      }
      const gauges = await Promise.all(
        enabledGamemodes.map(gamemode => GamemodeQueueGauge({ gamemode })),
      )
      let operator = app.gateway.to({ url: '/' })
      if (recipients.gamemode) {
        operator = operator.to({ gamemode: recipients.gamemode })
      }
      operator.send(() => gauges)
    }

    async function syncQueuePage(socket: AppWebSocket, gamemode: Gamemode) {
      const slots = await collections.queueSlots.find({ gamemode }).toArray()
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
        socket.send(await QueueSlot({ slot, actor }))
      })
      if (enabledGamemodes.length > 1) {
        enabledGamemodes.forEach(async g => {
          socket.send(await GamemodeQueueGauge({ gamemode: g }))
        })
      }
      socket.send(await IsInQueue({ actor: socket.player?.steamId }))
      socket.send(await SubstitutionRequests())
      socket.send(await CurrentPlayerCount({ gamemode }))
      socket.send(await SetTitle({ gamemode }))
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
      const gamemode = socket.currentUrl && queuePageGamemode(socket.currentUrl)
      if (!gamemode) {
        return
      }

      await syncQueuePage(socket, gamemode)
    })

    app.gateway.on('navigated', async (socket, url) => {
      const gamemode = queuePageGamemode(url)
      if (!gamemode) {
        return
      }

      await syncQueuePage(socket, gamemode)
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
      safe(async ({ gamemode, slots }) => {
        const connectedPlayers = [...(app.websocketServer.clients as Set<AppWebSocket>)]
          .map(c => c.player?.steamId)
          .filter((id): id is SteamId64 => id !== undefined)

        const [playerCount, actorMap] = await Promise.all([
          CurrentPlayerCount({ gamemode }),
          fetchActorMap(connectedPlayers),
        ])

        app.gateway
          .to({ url: '/' })
          .to({ gamemode })
          .send(player => {
            const actor = player ? actorMap.get(player) : undefined
            return Promise.all(slots.map(slot => QueueSlot({ slot, actor }))).then(items => [
              ...items,
              playerCount,
            ])
          })

        app.gateway
          .to({ url: '/' })
          .to({ gamemode })
          .send(() => SetTitle({ gamemode }))

        await syncGamemodeGauges({})
      }),
    )

    events.on(
      'queue/state:updated',
      safe(async ({ gamemode, state }) => {
        if (state === QueueState.ready) {
          const players = (
            await collections.queueSlots
              .find({ gamemode, player: { $ne: null }, ready: { $eq: false } })
              .toArray()
          ).map(s => s.player!.steamId)

          app.gateway.to({ players }).send(actor => ReadyUpDialog.show(actor!))
        }
      }),
    )

    events.on('queue/mapOptions:reset', ({ gamemode }) => {
      app.gateway
        .to({ url: '/' })
        .to({ gamemode })
        .send(actor => MapVote({ gamemode, actor }))
    })

    events.on(
      'queue/mapVoteResults:updated',
      safe(async ({ gamemode, results }) => {
        const mapOptions = await collections.queueMapOptions.find({ gamemode }).toArray()
        for (const map of mapOptions.map(option => option.name)) {
          app.gateway
            .to({ url: '/' })
            .to({ gamemode })
            .send(() => MapResult({ results, map }))
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
      safe(async ({ gamemode, target }) => {
        const slot = await collections.queueSlots.findOne({ gamemode, 'player.steamId': target })
        if (!slot) {
          return
        }
        const recipientIds = (
          await collections.queueSlots
            .find({ gamemode, 'canMakeFriendsWith.0': { $exists: true }, player: { $ne: null } })
            .toArray()
        ).map(({ player }) => player!.steamId)
        const actorMap = await fetchActorMap(recipientIds)
        app.gateway
          .to({ players: recipientIds })
          .to({ gamemode })
          .send(actor => QueueSlot({ slot, actor: actorMap.get(actor!) }))
      }),
    )

    events.on(
      'queue/friendship:updated',
      safe(async ({ gamemode, target }) => {
        const [slots, friendshipSlots] = await Promise.all([
          collections.queueSlots
            .find({ gamemode, 'player.steamId': { $in: [target.before, target.after] } })
            .toArray(),
          collections.queueSlots
            .find({ gamemode, 'canMakeFriendsWith.0': { $exists: true }, player: { $ne: null } })
            .toArray(),
        ])
        const recipients = friendshipSlots.map(({ player }) => player!.steamId)
        const actorMap = await fetchActorMap(recipients)
        for (const slot of slots) {
          app.gateway
            .to({ players: recipients })
            .to({ gamemode })
            .send(actor => QueueSlot({ slot, actor: actorMap.get(actor!) }))
        }
      }),
    )

    events.on(
      'queue/friendship:removed',
      safe(async ({ gamemode, target }) => {
        const slot = await collections.queueSlots.findOne({ gamemode, 'player.steamId': target })
        if (!slot) {
          return
        }
        const recipientIds = (
          await collections.queueSlots
            .find({ gamemode, 'canMakeFriendsWith.0': { $exists: true }, player: { $ne: null } })
            .toArray()
        ).map(({ player }) => player!.steamId)
        const actorMap = await fetchActorMap(recipientIds)
        app.gateway
          .to({ players: recipientIds })
          .to({ gamemode })
          .send(actor => QueueSlot({ slot, actor: actorMap.get(actor!) }))
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
