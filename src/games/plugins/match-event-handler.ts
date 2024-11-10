import fp from 'fastify-plugin'
import { events } from '../../events'
import { GameState } from '../../database/models/game.model'
import { Tf2Team } from '../../shared/types/tf2-team'
import { GameEndedReason, GameEventType } from '../../database/models/game-event.model'
import { PlayerConnectionStatus, SlotStatus } from '../../database/models/game-slot.model'
import { update } from '../update'
import { assertIsError } from '../../utils/assert-is-error'
import { logger } from '../../logger'
import { collections } from '../../database/collections'
import { safe } from '../../utils/safe'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on('match:started', async ({ gameNumber }) => {
      try {
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
      } catch (error) {
        assertIsError(error)
        logger.warn(error)
      }
    })

    events.on('match:ended', async ({ gameNumber }) => {
      try {
        await update(
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
      } catch (error) {
        assertIsError(error)
        logger.warn(error)
      }
    })

    events.on(
      'match/player:connected',
      safe(async ({ gameNumber, steamId }) => {
        const player = await collections.players.findOne({ steamId })
        if (!player) {
          throw new Error(`player with steamId ${steamId} not found`)
        }

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
                player: player._id,
              },
            },
          },
          {
            arrayFilters: [{ 'element.player': { $eq: player._id } }],
          },
        )
        events.emit('game:playerConnectionStatusUpdated', {
          game,
          player: steamId,
          playerConnectionStatus: PlayerConnectionStatus.joining,
        })
      }),
    )

    events.on('match/player:joinedTeam', async ({ gameNumber, steamId, team }) => {
      try {
        const player = await collections.players.findOne({ steamId })
        if (!player) {
          throw new Error(`player with steamId ${steamId} not found`)
        }

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
                player: player._id,
                team,
              },
            },
          },
          {
            arrayFilters: [{ 'element.player': { $eq: player._id } }],
          },
        )
        events.emit('game:playerConnectionStatusUpdated', {
          game,
          player: steamId,
          playerConnectionStatus: PlayerConnectionStatus.connected,
        })
      } catch (error) {
        assertIsError(error)
        logger.warn(error)
      }
    })

    events.on('match/player:disconnected', async ({ gameNumber, steamId }) => {
      try {
        const player = await collections.players.findOne({ steamId })
        if (!player) {
          throw new Error(`player with steamId ${steamId} not found`)
        }

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
                player: player._id,
              },
            },
          },
          {
            arrayFilters: [{ 'element.player': { $eq: player._id } }],
          },
        )
        events.emit('game:playerConnectionStatusUpdated', {
          game,
          player: steamId,
          playerConnectionStatus: PlayerConnectionStatus.offline,
        })
      } catch (error) {
        assertIsError(error)
        logger.warn(error)
      }
    })

    events.on('match/score:final', async ({ gameNumber, team, score }) => {
      try {
        await update(gameNumber, {
          $set: {
            [`score.${team}`]: score,
          },
        })
      } catch (error) {
        assertIsError(error)
        logger.warn(error)
      }
    })

    events.on('match/logs:uploaded', async ({ gameNumber, logsUrl }) => {
      try {
        await update(gameNumber, { $set: { logsUrl } })
      } catch (error) {
        assertIsError(error)
        logger.warn(error)
      }
    })

    events.on('match/demo:uploaded', async ({ gameNumber, demoUrl }) => {
      try {
        await update(gameNumber, {
          $set: { demoUrl },
        })
      } catch (error) {
        assertIsError(error)
        logger.warn(error)
      }
    })
  },
  { name: 'match event handler' },
)
