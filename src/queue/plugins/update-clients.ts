import fp from 'fastify-plugin'
import { events } from '../../events'
import { OnlinePlayerList } from '../views/html/online-player-list'
import { safe } from '../../utils/safe'
import { QueueState as QueueStateCmp } from '../views/html/queue-state'
import { QueueSlot } from '../views/html/queue-slot'
import { collections } from '../../database/collections'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { ReadyUpDialog } from '../views/html/ready-up-dialog'
import { QueueState } from '../../database/models/queue-state.model'
import { MapResult, MapVote } from '../views/html/map-vote'
import { SetTitle } from '../views/html/set-title'
import { SubstitutionRequests } from '../views/html/substitution-requests'
import { GameState } from '../../database/models/game.model'
import { RunningGameSnackbar } from '../views/html/running-game-snackbar'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    app.gateway.on('connected', async socket => {
      const slots = await collections.queueSlots.find().toArray()
      slots.forEach(async slot => {
        socket.send(await QueueSlot({ slot, actor: socket.player?.steamId }))
      })
      socket.send(await QueueStateCmp())
      socket.send(await OnlinePlayerList())

      if (socket.player) {
        const player = await collections.players.findOne({ steamId: socket.player.steamId })
        socket.send(await RunningGameSnackbar({ gameNumber: player?.activeGame }))
      }
    })

    events.on('player:connected', async () => {
      await safe(async () => {
        const cmp = await OnlinePlayerList()
        app.gateway.broadcast(() => cmp)
      })
    })

    events.on('player:disconnected', async () => {
      await safe(async () => {
        const cmp = await OnlinePlayerList()
        app.gateway.broadcast(() => cmp)
      })
    })

    events.on('player:updated', async ({ before, after }) => {
      await safe(async () => {
        if (before.activeGame !== after.activeGame) {
          console.log('player:updated', before.activeGame, after.activeGame)
          const cmp = await RunningGameSnackbar({ gameNumber: after.activeGame })
          app.gateway.toPlayers(after.steamId).broadcast(() => cmp)
        }
      })
    })

    events.on('queue/slots:updated', async ({ slots }) => {
      await safe(async () => {
        const queueState = await QueueStateCmp()
        app.gateway.broadcast(
          async player =>
            await Promise.all([
              ...slots.map(async slot => await QueueSlot({ slot, actor: player })),
              queueState,
            ]),
        )

        const [current, required] = await Promise.all([
          collections.queueSlots.countDocuments({ player: { $ne: null } }),
          collections.queueSlots.countDocuments(),
        ])
        app.gateway.broadcast(async () => await SetTitle({ current, required }))
      })
    })

    events.on('queue/state:updated', async ({ state }) => {
      await safe(async () => {
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
      })
    })

    events.on('queue/mapOptions:reset', () => {
      app.gateway.broadcast(async actor => await MapVote({ actor }))
    })

    events.on('queue/mapVoteResults:updated', async ({ results }) => {
      await safe(async () => {
        const mapOptions = await collections.queueMapOptions.find().toArray()
        for (const map of mapOptions.map(option => option.name)) {
          app.gateway.broadcast(async () => MapResult({ results, map }))
        }
      })
    })

    events.on('queue/friendship:created', async ({ target }) => {
      await safe(async () => {
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
      })
    })

    events.on('queue/friendship:updated', async ({ target }) => {
      await safe(async () => {
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
      })
    })

    events.on('queue/friendship:removed', async ({ target }) => {
      await safe(async () => {
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
      })
    })

    const refreshSubstitutionRequests = async () => {
      const cmp = await SubstitutionRequests()
      app.gateway.broadcast(() => cmp)
    }
    events.on('game:substituteRequested', refreshSubstitutionRequests)
    events.on('game:playerReplaced', refreshSubstitutionRequests)
    events.on('game:updated', async ({ before, after }) => {
      if (
        before.state !== after.state &&
        [GameState.ended, GameState.interrupted].includes(after.state)
      ) {
        await refreshSubstitutionRequests()
      }
    })
  },
  { name: 'update clients' },
)
