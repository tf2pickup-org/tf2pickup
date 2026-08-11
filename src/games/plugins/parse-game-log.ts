import fp from 'fastify-plugin'
import { ValueType } from '@opentelemetry/api'
import { events } from '../../events'
import { collections } from '../../database/collections'
import { logger } from '../../logger'
import { meter } from '../../otel'
import { analyze } from '../../tf2-analyst/analyze'
import { createGameContext } from '../../tf2-analyst/create-game-context'
import type { GameContext } from '../../tf2-analyst/game-context'
import type { LogEvent } from '../../tf2-analyst/log-event'
import type { GameNumber } from '../../database/models/game.model'
import { Tf2Team } from '../../shared/types/tf2-team'
import { GameEventType } from '../../database/models/game-event.model'
import { update } from '../update'

// Interpret each incoming log line with tf2-analyst and turn the events it
// produces back into the app's game events. This replaces the old
// match-event-listener (line → event regexes) and track-match-rounds (round
// assembly, side-swaps, restart detection), which now live inside the analyst.
export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    const eventCounter = meter.createCounter('tf2pickup.games.events.count', {
      description: 'Game events that come from the gameserver',
      unit: '1',
      valueType: ValueType.INT,
    })

    // Serialize processing per game so the context read-modify-write never
    // races. This gives the analyst a single-threaded, ordered stream of lines —
    // the guarantee that lets its fold replace the old atomic round-commit logic.
    const queues = new Map<string, Promise<void>>()
    function enqueue(logSecret: string, operation: () => Promise<void>): void {
      const previous = queues.get(logSecret) ?? Promise.resolve()
      const current = previous.then(operation).catch((error: unknown) => {
        logger.error(error, 'error parsing game log line')
      })
      queues.set(logSecret, current)
    }

    async function loadContext(gameNumber: GameNumber): Promise<GameContext> {
      const state = await collections.gamesLogParseState.findOne({ gameNumber })
      return state?.context ?? createGameContext()
    }

    async function apply(gameNumber: GameNumber, event: LogEvent): Promise<void> {
      switch (event.event) {
        case 'round started':
          events.emit('match:started', { gameNumber })
          break
        case 'round ended':
          logger.info({ gameNumber, ...event }, 'round ended')
          await update(
            { number: gameNumber },
            {
              $set: {
                'score.blu': event.score[Tf2Team.blu],
                'score.red': event.score[Tf2Team.red],
              },
              $push: {
                events: {
                  at: new Date(),
                  event: GameEventType.roundEnded,
                  winner: event.winner,
                  lengthMs: event.lengthMs,
                  score: {
                    [Tf2Team.red]: event.score[Tf2Team.red],
                    [Tf2Team.blu]: event.score[Tf2Team.blu],
                  },
                  captures: event.captures,
                },
              },
            },
          )
          break
        case 'teams swapped':
          logger.info({ gameNumber }, 'teams swapped sides')
          await update(
            { number: gameNumber },
            { $push: { events: { at: new Date(), event: GameEventType.teamsSwapped } } },
          )
          break
        case 'score reset':
          events.emit('match/score:reset', { gameNumber })
          break
        case 'match ended':
          events.emit('match:ended', { gameNumber })
          break
        case 'final score':
          events.emit('match/score:final', { gameNumber, team: event.team, score: event.score })
          break
        case 'player connected':
          events.emit('match/player:connected', {
            gameNumber,
            steamId: event.steamId,
            ipAddress: event.ipAddress,
          })
          break
        case 'player joined team':
          events.emit('match/player:joinedTeam', {
            gameNumber,
            steamId: event.steamId,
            team: event.team,
          })
          break
        case 'player disconnected':
          events.emit('match/player:disconnected', { gameNumber, steamId: event.steamId })
          break
        case 'player said':
          events.emit('match/player:said', {
            gameNumber,
            steamId: event.steamId,
            message: event.message,
          })
          break
        case 'logs uploaded':
          events.emit('match/logs:uploaded', { gameNumber, logsUrl: event.logsUrl })
          break
        case 'demo uploaded':
          events.emit('match/demo:uploaded', { gameNumber, demoUrl: event.demoUrl })
          break
      }
    }

    events.on('gamelog:message', ({ message }) => {
      enqueue(message.password, async () => {
        const game = await collections.games.findOne(
          { logSecret: message.password },
          { projection: { number: 1 } },
        )
        if (game === null) {
          eventCounter.add(1, { 'tf2pickup.games.event.handled': false })
          return
        }

        const context = await loadContext(game.number)
        const logEvents = analyze(context, message.payload)
        await collections.gamesLogParseState.updateOne(
          { gameNumber: game.number },
          { $set: { context, at: new Date() } },
          { upsert: true },
        )

        eventCounter.add(1, {
          'tf2pickup.games.event.handled': logEvents.length > 0,
          'tf2pickup.game.number': game.number,
        })

        for (const event of logEvents) {
          await apply(game.number, event)
        }
      })
    })
  },
  { name: 'parse game log', encapsulate: true },
)
