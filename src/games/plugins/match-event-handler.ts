import fp from 'fastify-plugin'
import { events } from '../../events'
import { GameState } from '../../database/models/game.model'
import { Tf2Team } from '../../shared/types/tf2-team'
import { GameEndedReason, GameEventType } from '../../database/models/game-event.model'
import { PlayerConnectionStatus, SlotStatus } from '../../database/models/game-slot.model'
import { update } from '../update'
import { safe } from '../../utils/safe'
import { collections } from '../../database/collections'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on(
      'match:started',
      safe(async ({ gameNumber }) => {
        // Game servers fire match:started repeatedly (map load, mp_restartgame).
        // The first event transitions the game launching -> started; ignore the
        // rest instead of failing to find a launching game.
        const game = await collections.games.findOne(
          { number: gameNumber },
          { projection: { state: 1 } },
        )
        if (game?.state !== GameState.launching) {
          return
        }
        await update(
          { number: gameNumber, state: GameState.launching },
          {
            $set: {
              state: GameState.started,
              score: {
                [Tf2Team.blu]: 0,
                [Tf2Team.red]: 0,
              },
            },
            $push: {
              events: {
                at: new Date(),
                event: GameEventType.gameStarted,
              },
            },
          },
        )
      }),
    )

    events.on(
      'match/score:reset',
      safe(async ({ gameNumber }) => {
        // The server reset its scoreboard mid-match (tournament restart —
        // everyone left to spectator, an admin re-exec'd the config, etc.) —
        // rounds won before the restart no longer count. Zero our score to
        // match and record the restart.
        const game = await collections.games.findOne(
          { number: gameNumber },
          { projection: { state: 1 } },
        )
        if (game?.state !== GameState.started) {
          return
        }
        const updated = await update(
          { number: gameNumber, state: GameState.started },
          {
            $set: {
              score: {
                [Tf2Team.blu]: 0,
                [Tf2Team.red]: 0,
              },
            },
            $push: {
              events: {
                at: new Date(),
                event: GameEventType.gameRestarted,
              },
            },
          },
        )
        events.emit('game:restarted', { game: updated })
      }),
    )

    events.on(
      'match:ended',
      safe(async ({ gameNumber }) => {
        // Gameservers re-fire match:ended after the game already left the started
        // state (ended, force-ended, restarted). Ignore the rest instead of
        // failing to find a started game.
        const existing = await collections.games.findOne(
          { number: gameNumber },
          { projection: { state: 1 } },
        )
        if (existing?.state !== GameState.started) {
          return
        }
        await collections.gamesSubstituteRequests.deleteMany({ gameNumber })
        const game = await update(
          { number: gameNumber, state: GameState.started },
          {
            $set: {
              state: GameState.ended,
              'slots.$[element].status': SlotStatus.active,
            },
            $push: {
              events: {
                at: new Date(),
                event: GameEventType.gameEnded,
                reason: GameEndedReason.matchEnded,
              },
            },
          },
          {
            arrayFilters: [
              {
                'element.status': {
                  $eq: SlotStatus.waitingForSubstitute,
                },
              },
            ],
          },
        )
        events.emit('game:ended', { game })
      }),
    )

    events.on(
      'match/player:connected',
      safe(async ({ gameNumber, steamId }) => {
        const game = await update(
          gameNumber,
          {
            $set: {
              'slots.$[element].connectionStatus': PlayerConnectionStatus.joining,
            },
            $push: {
              events: {
                at: new Date(),
                event: GameEventType.playerJoinedGameServer,
                player: steamId,
              },
            },
          },
          {
            arrayFilters: [{ 'element.player': { $eq: steamId } }],
          },
        )
        events.emit('game:playerConnectionStatusUpdated', {
          game,
          player: steamId,
          playerConnectionStatus: PlayerConnectionStatus.joining,
        })
      }),
    )

    events.on(
      'match/player:joinedTeam',
      safe(async ({ gameNumber, steamId, team }) => {
        const game = await update(
          gameNumber,
          {
            $set: {
              'slots.$[element].connectionStatus': PlayerConnectionStatus.connected,
            },
            $push: {
              events: {
                at: new Date(),
                event: GameEventType.playerJoinedGameServerTeam,
                player: steamId,
                team,
              },
            },
          },
          {
            arrayFilters: [{ 'element.player': { $eq: steamId } }],
          },
        )
        events.emit('game:playerConnectionStatusUpdated', {
          game,
          player: steamId,
          playerConnectionStatus: PlayerConnectionStatus.connected,
        })
      }),
    )

    events.on(
      'match/player:disconnected',
      safe(async ({ gameNumber, steamId }) => {
        const game = await update(
          gameNumber,
          {
            $set: {
              'slots.$[element].connectionStatus': PlayerConnectionStatus.offline,
            },
            $push: {
              events: {
                at: new Date(),
                event: GameEventType.playerLeftGameServer,
                player: steamId,
              },
            },
          },
          {
            arrayFilters: [{ 'element.player': { $eq: steamId } }],
          },
        )
        events.emit('game:playerConnectionStatusUpdated', {
          game,
          player: steamId,
          playerConnectionStatus: PlayerConnectionStatus.offline,
        })
      }),
    )

    events.on(
      'match/logs:uploaded',
      safe(async ({ gameNumber, logsUrl }) => {
        await update(gameNumber, { $set: { logsUrl } })
      }),
    )

    events.on(
      'match/demo:uploaded',
      safe(async ({ gameNumber, demoUrl }) => {
        await update(gameNumber, {
          $set: { demoUrl },
        })
      }),
    )
  },
  { name: 'match event handler' },
)
