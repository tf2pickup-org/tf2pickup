import fp from 'fastify-plugin'
import { collections } from '../../database/collections'
import { PlayerConnectionStatus } from '../../database/models/game-slot.model'
import { GameState } from '../../database/models/game.model'
import { events } from '../../events'
import { ConnectInfo } from '../views/html/connect-info'
import { DemoLink } from '../views/html/demo-link'
import { GameSlotList } from '../views/html/game-slot-list'
import { GameStateIndicator } from '../views/html/game-state-indicator'
import { LogsLink } from '../views/html/logs-link'
import { PlayerConnectionStatusIndicator } from '../views/html/player-connection-status-indicator'
import { GameEventList } from '../views/html/game-event-list'
import { GameSlot } from '../views/html/game-slot'
import { whenGameEnds } from '../when-game-ends'
import { GamesLink } from '../../html/components/games-link'
import { safe } from '../../utils/safe'

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(async app => {
  events.on('game:updated', async ({ before, after }) => {
    if (before.state !== after.state) {
      app.gateway.broadcast(async () => await GameStateIndicator({ game: after }))
      app.gateway.broadcast(async actor => await ConnectInfo({ game: after, actor }))

      if ([GameState.launching, GameState.ended, GameState.interrupted].includes(after.state)) {
        app.gateway.broadcast(async actor => await GameSlotList({ game: after, actor }))
      }
    }

    if (
      before.connectString !== after.connectString ||
      before.stvConnectString !== after.stvConnectString
    ) {
      app.gateway.broadcast(async actor => await ConnectInfo({ game: after, actor }))
    }

    if (before.logsUrl !== after.logsUrl) {
      app.gateway.broadcast(async () => await LogsLink({ game: after }))
    }

    if (before.demoUrl !== after.demoUrl) {
      app.gateway.broadcast(async () => await DemoLink({ game: after }))
    }

    if (before.events.length < after.events.length) {
      app.gateway.broadcast(async () => await GameEventList({ game: after }))
    }

    await Promise.all(
      after.slots.map(async slot => {
        const beforeSlot = before.slots.find(s => s.player.equals(slot.player))
        if (!beforeSlot) {
          return
        }

        if (beforeSlot.shouldJoinBy !== slot.shouldJoinBy) {
          const player = await collections.players.findOne({ _id: slot.player })
          if (!player) {
            throw new Error(`no such player: ${slot.player.toString()}`)
          }
          app.gateway
            .toPlayers(player.steamId)
            .broadcast(async actor => await ConnectInfo({ game: after, actor }))
        }
      }),
    )
  })

  events.on('game:created', async () => {
    const cmp = await GamesLink()
    app.gateway.broadcast(() => cmp)
  })

  events.on(
    'game:updated',
    whenGameEnds(async () => {
      const cmp = await GamesLink()
      app.gateway.broadcast(() => cmp)
    }),
  )

  events.on(
    'match/player:connected',
    safe(async ({ gameNumber, steamId }) => {
      const player = await collections.players.findOne({ steamId })
      if (!player) {
        throw new Error(`no such player: ${steamId}`)
      }
      const game = await collections.games.findOne({ number: gameNumber })
      if (!game) {
        throw new Error(`game ${gameNumber} not found`)
      }

      app.gateway.broadcast(
        async () =>
          await PlayerConnectionStatusIndicator({
            steamId: player.steamId,
            connectionStatus: PlayerConnectionStatus.joining,
          }),
      )
      app.gateway
        .toPlayers(player.steamId)
        .broadcast(async actor => await ConnectInfo({ game, actor }))
    }),
  )

  events.on(
    'match/player:joinedTeam',
    safe(async ({ gameNumber, steamId }) => {
      const player = await collections.players.findOne({ steamId })
      if (!player) {
        throw new Error(`no such player: ${steamId}`)
      }
      const game = await collections.games.findOne({ number: gameNumber })
      if (!game) {
        throw new Error(`game ${gameNumber} not found`)
      }

      app.gateway.broadcast(
        async () =>
          await PlayerConnectionStatusIndicator({
            steamId: player.steamId,
            connectionStatus: PlayerConnectionStatus.connected,
          }),
      )
      app.gateway
        .toPlayers(player.steamId)
        .broadcast(async actor => await ConnectInfo({ game, actor }))
    }),
  )

  events.on(
    'match/player:disconnected',
    safe(async ({ gameNumber, steamId }) => {
      const player = await collections.players.findOne({ steamId })
      if (!player) {
        throw new Error(`no such player: ${steamId}`)
      }
      const game = await collections.games.findOne({ number: gameNumber })
      if (!game) {
        throw new Error(`game ${gameNumber} not found`)
      }

      app.gateway.broadcast(
        async () =>
          await PlayerConnectionStatusIndicator({
            steamId: player.steamId,
            connectionStatus: PlayerConnectionStatus.offline,
          }),
      )
      app.gateway
        .toPlayers(player.steamId)
        .broadcast(async actor => await ConnectInfo({ game, actor }))
    }),
  )

  events.on('game:substituteRequested', async ({ game, replacee }) => {
    const r = await collections.players.findOne({ steamId: replacee })
    if (!r) {
      throw new Error(`no such player: ${replacee}`)
    }
    const slot = game.slots.find(s => s.player.equals(r._id))
    if (!slot) {
      throw new Error(`no such game slot: ${game.number} ${replacee}`)
    }

    app.gateway.broadcast(async actor => await GameSlot({ game, slot, actor }))
  })

  events.on('game:playerReplaced', ({ game }) => {
    // fixme refresh only one slot
    app.gateway.broadcast(async actor => await GameSlotList({ game, actor }))
  })
})
