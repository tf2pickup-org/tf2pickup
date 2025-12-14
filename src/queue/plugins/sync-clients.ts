import fp from 'fastify-plugin'
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
import { WebSocket } from 'ws'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    async function syncAllSlots(...players: SteamId64[]) {
      const slots = await collections.queueSlots.find().toArray()
      slots.forEach(slot => {
        app.gateway
          .to({ players })
          .to({ url: '/' })
          .send(async actor => await QueueSlot({ slot, actor }))
      })
    }

    async function syncQueuePage(socket: WebSocket) {
      const slots = await collections.queueSlots.find().toArray()
      slots.forEach(async slot => {
        socket.send(await QueueSlot({ slot, actor: socket.player?.steamId }))
      })
      socket.send(await IsInQueue({ actor: socket.player?.steamId }))
      socket.send(await SubstitutionRequests())
      socket.send(await CurrentPlayerCount())
      socket.send(await SetTitle())
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

    async function updateOnlinePlayers() {
      const opl = await OnlinePlayerList()
      const opc = await OnlinePlayerCount()
      app.gateway.to({ url: '/' }).send(() => [opl, opc])
    }

    events.on('player:connected', safe(updateOnlinePlayers))
    events.on('player:disconnected', safe(updateOnlinePlayers))

    events.on(
      'player:updated',
      safe(async ({ before, after }) => {
        if (before.activeGame !== after.activeGame) {
          const cmp = await RunningGameSnackbar({ gameNumber: after.activeGame })
          app.gateway
            .to({ player: after.steamId })
            .to({ url: '/' })
            .send(() => cmp)
          await syncAllSlots(after.steamId)
        }

        if (before.preReadyUntil !== after.preReadyUntil) {
          app.gateway
            .to({ player: after.steamId })
            .to({ url: '/' })
            .send(async actor => await PreReadyUpButton({ actor }))
        }
      }),
    )

    events.on('queue:playerKicked', async ({ player }) => {
      const close = await ReadyUpDialog.close()
      app.gateway.to({ player }).send(() => close)
    })

    events.on(
      'queue/slots:updated',
      safe(async ({ slots }) => {
        const playerCount = await CurrentPlayerCount()
        app.gateway.broadcast(async player => [
          ...(await Promise.all(slots.map(async slot => await QueueSlot({ slot, actor: player })))),
          playerCount,
        ])

        app.gateway.broadcast(async () => await SetTitle())
      }),
    )

    events.on(
      'queue/state:updated',
      safe(async ({ state }) => {
        if (state === QueueState.ready) {
          const players = (
            await collections.queueSlots
              .find({ player: { $ne: null }, ready: { $eq: false } })
              .toArray()
          ).map(s => s.player!.steamId)

          app.gateway.to({ players }).send(async actor => await ReadyUpDialog.show(actor!))
        }
      }),
    )

    events.on('queue/mapOptions:reset', () => {
      app.gateway.to({ url: '/' }).send(async actor => await MapVote({ actor }))
    })

    events.on(
      'queue/mapVoteResults:updated',
      safe(async ({ results }) => {
        const mapOptions = await collections.queueMapOptions.find().toArray()
        for (const map of mapOptions.map(option => option.name)) {
          app.gateway.to({ url: '/' }).send(async () => MapResult({ results, map }))
        }
      }),
    )

    events.on(
      'queue/friendship:created',
      safe(async ({ target }) => {
        const slot = await collections.queueSlots.findOne({ 'player.steamId': target })
        if (!slot) {
          return
        }
        const players = (
          await collections.queueSlots
            .find({ 'canMakeFriendsWith.0': { $exists: true }, player: { $ne: null } })
            .toArray()
        ).map(({ player }) => player!.steamId)
        app.gateway.to({ players }).send(async actor => await QueueSlot({ slot, actor }))
      }),
    )

    events.on(
      'queue/friendship:updated',
      safe(async ({ target }) => {
        const players = (
          await collections.queueSlots
            .find({ 'canMakeFriendsWith.0': { $exists: true }, player: { $ne: null } })
            .toArray()
        ).map(({ player }) => player!.steamId)

        const slots = await collections.queueSlots
          .find({ 'player.steamId': { $in: [target.before, target.after] } })
          .toArray()
        slots.forEach(slot => {
          app.gateway.to({ players }).send(async actor => await QueueSlot({ slot, actor }))
        })
      }),
    )

    events.on(
      'queue/friendship:removed',
      safe(async ({ target }) => {
        const slot = await collections.queueSlots.findOne({ 'player.steamId': target })
        if (!slot) {
          return
        }
        const players = (
          await collections.queueSlots
            .find({ 'canMakeFriendsWith.0': { $exists: true }, player: { $ne: null } })
            .toArray()
        ).map(({ player }) => player!.steamId)
        app.gateway.to({ players }).send(async actor => await QueueSlot({ slot, actor }))
      }),
    )

    const refreshSubstitutionRequests = async () => {
      const cmp = await SubstitutionRequests()
      app.gateway.to({ url: '/' }).send(() => cmp)
    }
    events.on('game:substituteRequested', async ({ game, replacee }) => {
      await refreshSubstitutionRequests()
      app.gateway.broadcast(
        async actor => await SubstitutionRequests.notify({ game, replacee, actor }),
      )
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
  },
  { name: 'update clients' },
)
