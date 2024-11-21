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
import type { ObjectId } from 'mongodb'
import { whenGameEnds } from '../../games/when-game-ends'
import { CurrentPlayerCount } from '../views/html/current-player-count'
import { PreReadyUpButton } from '../views/html/pre-ready-up-button'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    async function syncAllSlots(...players: SteamId64[]) {
      const slots = await collections.queueSlots.find().toArray()
      slots.forEach(async slot => {
        app.gateway.toPlayers(...players).broadcast(async actor => await QueueSlot({ slot, actor }))
      })
    }

    app.gateway.on('connected', async socket => {
      const slots = await collections.queueSlots.find().toArray()
      slots.forEach(async slot => {
        socket.send(await QueueSlot({ slot, actor: socket.player?.steamId }))
      })
      socket.send(await CurrentPlayerCount())
      socket.send(await OnlinePlayerList())

      if (socket.player) {
        const player = await collections.players.findOne({ steamId: socket.player.steamId })
        socket.send(await RunningGameSnackbar({ gameNumber: player?.activeGame }))
      }
    })

    events.on(
      'player:connected',
      safe(async () => {
        const cmp = await OnlinePlayerList()
        app.gateway.broadcast(() => cmp)
      }),
    )

    events.on(
      'player:disconnected',
      safe(async () => {
        const cmp = await OnlinePlayerList()
        app.gateway.broadcast(() => cmp)
      }),
    )

    events.on(
      'player:updated',
      safe(async ({ before, after }) => {
        if (before.activeGame !== after.activeGame) {
          const cmp = await RunningGameSnackbar({ gameNumber: after.activeGame })
          app.gateway.toPlayers(after.steamId).broadcast(() => cmp)
          await syncAllSlots(after.steamId)
        }

        if (before.preReadyUntil !== after.preReadyUntil) {
          app.gateway
            .toPlayers(after.steamId)
            .broadcast(async actor => await PreReadyUpButton({ actor }))
        }
      }),
    )

    events.on(
      'queue/slots:updated',
      safe(async ({ slots }) => {
        const playerCount = await CurrentPlayerCount()
        app.gateway.broadcast(
          async player =>
            await Promise.all([
              ...slots.map(async slot => await QueueSlot({ slot, actor: player })),
              playerCount,
            ]),
        )

        const [current, required] = await Promise.all([
          collections.queueSlots.countDocuments({ player: { $ne: null } }),
          collections.queueSlots.countDocuments(),
        ])
        app.gateway.broadcast(async () => await SetTitle({ current, required }))
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
          )
            .map(s => s.player)
            .filter(Boolean) as SteamId64[]

          const show = await ReadyUpDialog.show()
          app.gateway.toPlayers(...players).broadcast(() => show)
        }
      }),
    )

    events.on('queue/mapOptions:reset', () => {
      app.gateway.broadcast(async actor => await MapVote({ actor }))
    })

    events.on(
      'queue/mapVoteResults:updated',
      safe(async ({ results }) => {
        const mapOptions = await collections.queueMapOptions.find().toArray()
        for (const map of mapOptions.map(option => option.name)) {
          app.gateway.broadcast(async () => MapResult({ results, map }))
        }
      }),
    )

    events.on(
      'queue/friendship:created',
      safe(async ({ target }) => {
        const slot = await collections.queueSlots.findOne({ player: target })
        if (!slot) {
          return
        }
        const actors = await collections.queueSlots
          .find({ 'canMakeFriendsWith.0': { $exists: true }, player: { $ne: null } })
          .toArray()
        app.gateway
          .toPlayers(...actors.map(a => a.player!))
          .broadcast(async actor => await QueueSlot({ slot, actor }))
      }),
    )

    events.on(
      'queue/friendship:updated',
      safe(async ({ target }) => {
        const actors = await collections.queueSlots
          .find({ 'canMakeFriendsWith.0': { $exists: true }, player: { $ne: null } })
          .toArray()

        const slots = await collections.queueSlots
          .find({ player: { $in: [target.before, target.after] } })
          .toArray()
        slots.forEach(slot => {
          app.gateway
            .toPlayers(...actors.map(a => a.player!))
            .broadcast(async actor => await QueueSlot({ slot, actor }))
        })
      }),
    )

    events.on(
      'queue/friendship:removed',
      safe(async ({ target }) => {
        const slot = await collections.queueSlots.findOne({ player: target })
        if (!slot) {
          return
        }
        const actors = await collections.queueSlots
          .find({ 'canMakeFriendsWith.0': { $exists: true }, player: { $ne: null } })
          .toArray()
        app.gateway
          .toPlayers(...actors.map(a => a.player!))
          .broadcast(async actor => await QueueSlot({ slot, actor }))
      }),
    )

    const refreshSubstitutionRequests = async () => {
      const cmp = await SubstitutionRequests()
      app.gateway.broadcast(() => cmp)
    }
    events.on('game:substituteRequested', refreshSubstitutionRequests)
    events.on('game:playerReplaced', refreshSubstitutionRequests)
    events.on('game:updated', whenGameEnds(refreshSubstitutionRequests))
    events.on(
      'twitch.tv/streams:updated',
      safe(async () => {
        const cmp = await StreamList()
        app.gateway.broadcast(() => cmp)
      }),
    )

    const refreshBanAlerts = async (playerId: ObjectId) => {
      const player = await collections.players.findOne({ _id: playerId })
      if (!player) {
        throw new Error(`player not found for ban ${playerId.toString()}`)
      }
      const cmp = await BanAlerts({ actor: player.steamId })
      app.gateway.toPlayers(player?.steamId).broadcast(() => cmp)

      setImmediate(async () => {
        await syncAllSlots(player.steamId)
      })
    }
    events.on(
      'player/ban:added',
      safe(async ({ ban }) => {
        await refreshBanAlerts(ban.player)
      }),
    )
    events.on(
      'player/ban:revoked',
      safe(async ({ ban }) => {
        await refreshBanAlerts(ban.player)
      }),
    )
  },
  { name: 'update clients' },
)
