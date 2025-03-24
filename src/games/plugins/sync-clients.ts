import fp from 'fastify-plugin'
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
import { GamesLink } from '../../html/components/games-link'
import { GameScore } from '../views/html/game-score'
import { JoinVoiceButton } from '../views/html/join-voice-button'
import { JoinGameButton } from '../views/html/join-game-button'
import { Tf2Team } from '../../shared/types/tf2-team'
import { ServerReadyNotification } from '../views/html/server-ready-notification'

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(async app => {
  events.on('game:updated', async ({ before, after }) => {
    if (before.state !== after.state) {
      app.gateway
        .to({ url: `/games/${after.number}` })
        .send(async () => await GameStateIndicator({ game: after }))
      app.gateway
        .to({ url: `/games/${after.number}` })
        .send(async actor => await ConnectInfo({ game: after, actor }))

      if ([GameState.launching, GameState.ended, GameState.interrupted].includes(after.state)) {
        app.gateway
          .to({ url: `/games/${after.number}` })
          .send(async actor => await GameSlotList({ game: after, actor }))
      }
    }

    if (before.score?.blu !== after.score?.blu) {
      app.gateway
        .to({ url: `/games/${after.number}` })
        .send(async () => await GameScore({ game: after, team: Tf2Team.blu }))
    }

    if (before.score?.red !== after.score?.red) {
      app.gateway
        .to({ url: `/games/${after.number}` })
        .send(async () => await GameScore({ game: after, team: Tf2Team.red }))
    }

    if (
      before.connectString !== after.connectString ||
      before.stvConnectString !== after.stvConnectString
    ) {
      app.gateway
        .to({ url: `/games/${after.number}` })
        .send(async actor => await JoinGameButton({ game: after, actor }))
    }

    if (after.connectString !== undefined && before.connectString !== after.connectString) {
      app.gateway
        .to({ players: after.slots.map(({ player }) => player) })
        .send(async () => await ServerReadyNotification())
    }

    if (before.logsUrl !== after.logsUrl) {
      app.gateway
        .to({ url: `/games/${after.number}` })
        .send(async () => await LogsLink({ game: after }))
    }

    if (before.demoUrl !== after.demoUrl) {
      app.gateway
        .to({ url: `/games/${after.number}` })
        .send(async () => await DemoLink({ game: after }))
    }

    if (before.events.length < after.events.length) {
      const n = before.events.length - after.events.length
      const newEvents = after.events.slice(n)
      for (const event of newEvents) {
        app.gateway
          .to({ url: `/games/${after.number}` })
          .send(async () => await GameEventList.append({ game: after, event }))
      }
    }

    await Promise.all(
      after.slots.map(slot => {
        const beforeSlot = before.slots.find(s => s.player === slot.player)
        if (!beforeSlot) {
          return
        }

        if (beforeSlot.shouldJoinBy !== slot.shouldJoinBy) {
          app.gateway
            .to({ url: `/games/${after.number}` })
            .to({ player: slot.player })
            .send(async actor => await JoinGameButton({ game: after, actor }))
        }

        if (beforeSlot.voiceServerUrl !== slot.voiceServerUrl) {
          app.gateway
            .to({ url: `/games/${after.number}` })
            .to({ player: slot.player })
            .send(async actor => await JoinVoiceButton({ game: after, actor }))
        }
      }),
    )
  })

  async function refreshGamesLink() {
    const cmp = await GamesLink()
    app.gateway.broadcast(() => cmp)
  }
  events.on('game:created', refreshGamesLink)
  events.on('game:ended', refreshGamesLink)

  events.on('game:playerConnectionStatusUpdated', ({ game, player, playerConnectionStatus }) => {
    app.gateway.to({ url: `/games/${game.number}` }).send(
      async () =>
        await PlayerConnectionStatusIndicator({
          steamId: player,
          connectionStatus: playerConnectionStatus,
        }),
    )
    app.gateway
      .to({ url: `/games/${game.number}` })
      .to({ player })
      .send(async actor => await ConnectInfo({ game, actor }))
  })

  events.on('game:substituteRequested', ({ game, replacee }) => {
    const slot = game.slots.find(s => s.player === replacee)
    if (!slot) {
      throw new Error(`no such game slot: ${game.number} ${replacee}`)
    }

    app.gateway
      .to({ url: `/games/${game.number}` })
      .send(async actor => await GameSlot({ game, slot, actor }))
  })

  events.on('game:playerReplaced', ({ game }) => {
    // fixme refresh only one slot
    app.gateway
      .to({ url: `/games/${game.number}` })
      .send(async actor => await GameSlotList({ game, actor }))
  })
})
