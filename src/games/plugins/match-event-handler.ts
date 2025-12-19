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
      'match:restarted',
      safe(async ({ gameNumber }) => {
        await update(
          { number: gameNumber, state: GameState.started },
          {
            $set: {
              state: GameState.launching,
            },
            $unset: {
              score: 1,
            },
            $push: {
              events: {
                at: new Date(),
                event: GameEventType.gameRestarted,
              },
            },
          },
        )
      }),
    )

    events.on(
      'match:ended',
      safe(async ({ gameNumber }) => {
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
      'match/score:final',
      safe(async ({ gameNumber, team, score }) => {
        await update(gameNumber, {
          $set: {
            [`score.${team}`]: score,
          },
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
