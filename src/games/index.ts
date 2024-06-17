import fp from 'fastify-plugin'
import { update } from './update'
import { events } from '../events'
import { GameSlotList } from './views/html/game-slot-list'
import { GameStateIndicator } from './views/html/game-state-indicator'
import { ConnectInfo } from './views/html/connect-info'
import { LogsLink } from './views/html/logs-link'
import { DemoLink } from './views/html/demo-link'
import { collections } from '../database/collections'
import { GameState } from '../database/models/game.model'
import { PlayerConnectionStatusIndicator } from './views/html/player-connection-status-indicator'
import { PlayerConnectionStatus } from '../database/models/game-slot.model'

export const games = {
  update,
} as const

export default fp(
  async app => {
    await app.register((await import('./plugins/launch-new-game')).default)
    await app.register((await import('./plugins/auto-configure')).default)
    await app.register((await import('./plugins/match-event-listener')).default)
    await app.register((await import('./plugins/match-event-handler')).default)
    await app.register((await import('./plugins/game-log-collector')).default)

    events.on('game:updated', ({ before, after }) => {
      if (before.state !== after.state) {
        app.gateway.broadcast(async () => await GameStateIndicator({ game: after }))
        app.gateway.broadcast(async actor => await ConnectInfo({ game: after, actor }))

        if ([GameState.launching, GameState.ended].includes(after.state)) {
          app.gateway.broadcast(async () => await GameSlotList({ game: after }))
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
    })

    events.on('match/player:connected', async ({ steamId }) => {
      const player = await collections.players.findOne({ steamId })
      if (!player) {
        throw new Error(`no such player: ${steamId}`)
      }
      app.gateway.broadcast(
        async () =>
          await PlayerConnectionStatusIndicator({
            steamId: player.steamId,
            connectionStatus: PlayerConnectionStatus.joining,
          }),
      )
    })

    events.on('match/player:joinedTeam', async ({ steamId }) => {
      const player = await collections.players.findOne({ steamId })
      if (!player) {
        throw new Error(`no such player: ${steamId}`)
      }
      app.gateway.broadcast(
        async () =>
          await PlayerConnectionStatusIndicator({
            steamId: player.steamId,
            connectionStatus: PlayerConnectionStatus.connected,
          }),
      )
    })

    events.on('match/player:disconnected', async ({ steamId }) => {
      const player = await collections.players.findOne({ steamId })
      if (!player) {
        throw new Error(`no such player: ${steamId}`)
      }
      app.gateway.broadcast(
        async () =>
          await PlayerConnectionStatusIndicator({
            steamId: player.steamId,
            connectionStatus: PlayerConnectionStatus.offline,
          }),
      )
    })

    await app.register((await import('./routes')).default)
  },
  {
    name: 'games',
  },
)
