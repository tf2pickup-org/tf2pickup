import fp from 'fastify-plugin'
import { ValueType } from '@opentelemetry/api'
import { minutesToMilliseconds } from 'date-fns'
import { events } from '../../events'
import { collections } from '../../database/collections'
import { logger } from '../../logger'
import { meter } from '../../otel'
import { Tf2GameAnalyzer } from '../../tf2-game-analyzer/tf2-game-analyzer'
import type { LogEvent } from '../../tf2-game-analyzer/log-event'
import type { GameNumber } from '../../database/models/game.model'
import { Tf2Team } from '../../shared/types/tf2-team'
import { GameEventType } from '../../database/models/game-event.model'
import { update } from '../update'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    const eventCounter = meter.createCounter('tf2pickup.games.events.count', {
      description: 'Game events that come from the gameserver',
      unit: '1',
      valueType: ValueType.INT,
    })

    const queues = new Map<string, Promise<void>>()
    function enqueue(logSecret: string, operation: () => Promise<void>): void {
      const previous = queues.get(logSecret) ?? Promise.resolve()
      const current = previous.then(operation).catch((error: unknown) => {
        logger.error(error, 'error parsing game log line')
      })
      queues.set(logSecret, current)
    }

    const gameNumbers = new Map<string, GameNumber>() // logSecret -> game number
    const unknownUntil = new Map<string, number>() // logSecret -> epoch ms to retry a miss
    const analyzers = new Map<GameNumber, Tf2GameAnalyzer>()

    async function resolveGameNumber(logSecret: string): Promise<GameNumber | null> {
      const cached = gameNumbers.get(logSecret)
      if (cached !== undefined) {
        return cached
      }
      const retryAt = unknownUntil.get(logSecret)
      if (retryAt !== undefined && retryAt > Date.now()) {
        return null
      }
      const game = await collections.games.findOne({ logSecret }, { projection: { number: 1 } })
      if (game === null) {
        unknownUntil.set(logSecret, Date.now() + minutesToMilliseconds(1))
        return null
      }
      unknownUntil.delete(logSecret)
      gameNumbers.set(logSecret, game.number)
      return game.number
    }

    async function loadAnalyzer(gameNumber: GameNumber): Promise<Tf2GameAnalyzer> {
      const cached = analyzers.get(gameNumber)
      if (cached) {
        return cached
      }
      const state = await collections.gamesLogParseState.findOne({ gameNumber })
      const analyzer = new Tf2GameAnalyzer(state?.context)
      analyzers.set(gameNumber, analyzer)
      return analyzer
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
        const gameNumber = await resolveGameNumber(message.password)
        if (gameNumber === null) {
          eventCounter.add(1, { 'tf2pickup.games.event.handled': false })
          return
        }

        const analyzer = await loadAnalyzer(gameNumber)
        const logEvents = analyzer.parseLine(message.payload)

        if (analyzer.contextDirty()) {
          await collections.gamesLogParseState.updateOne(
            { gameNumber },
            { $set: { context: analyzer.context, at: new Date() } },
            { upsert: true },
          )
          analyzer.markPersisted()
        }

        eventCounter.add(1, {
          'tf2pickup.games.event.handled': logEvents.length > 0,
          'tf2pickup.game.number': gameNumber,
        })

        for (const event of logEvents) {
          await apply(gameNumber, event)
        }
      })
    })

    // Events keep arriving after a game ends (logs.tf and demos.tf uploads), so
    // free the in-memory caches only after a grace period; the database document
    // is left for the TTL index to sweep.
    events.on('game:ended', ({ game }) => {
      setTimeout(() => {
        analyzers.delete(game.number)
        if (game.logSecret) {
          gameNumbers.delete(game.logSecret)
          queues.delete(game.logSecret)
        }
      }, minutesToMilliseconds(10)).unref()
    })
  },
  { name: 'parse game log', encapsulate: true },
)
