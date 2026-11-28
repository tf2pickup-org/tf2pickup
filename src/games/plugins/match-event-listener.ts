import fp from 'fastify-plugin'
import { differenceInSeconds } from 'date-fns'
import type { GameNumber } from '../../database/models/game.model'
import { events } from '../../events'
import { decodeLogLine, type LogLineEvent } from '../decode-log-line'
import { collections } from '../../database/collections'
import { logger } from '../../logger'
import { meter } from '../../otel'
import { ValueType } from '@opentelemetry/api'
import { keyedMutex } from '../../utils/keyed-mutex'

// the last Round_Start line seen per game (cleared when a round ends with a
// win or a stalemate) and whether any Round_Start was seen at all this match;
// used to detect the doubled Round_Start below
const lastRoundStart = new Map<GameNumber, { at: Date; precededByRoundStart: boolean }>()
const seenRoundStart = new Set<GameNumber>()

function handle(gameNumber: GameNumber, event: LogLineEvent) {
  switch (event.type) {
    case 'round start': {
      // TF2 logs Round_Start once per regular round, but twice within the same
      // second (occasionally straddling a second boundary) when a tournament
      // match (re)starts. A regular round transition always has a Round_Win or a
      // Round_Stalemate between two Round_Starts (both clear the remembered line
      // below), so a pair ≤1s apart can only be the (re)start doubling — even
      // when log lines arrive with compressed timestamps, as in e2e log replays.
      // The pair at the initial match start is expected; a pair preceded by an
      // earlier Round_Start means the match was restarted mid-game (everyone
      // left to spectator, an admin re-exec'd the config,
      // mp_tournament_restart) and the server reset its scoreboard.
      events.emit('match:started', { gameNumber })
      const last = lastRoundStart.get(gameNumber)
      if (last && Math.abs(differenceInSeconds(event.at, last.at)) <= 1) {
        if (last.precededByRoundStart) {
          lastRoundStart.delete(gameNumber)
          events.emit('match/score:reset', { gameNumber })
        }
      } else {
        lastRoundStart.set(gameNumber, {
          at: event.at,
          precededByRoundStart: seenRoundStart.has(gameNumber),
        })
      }
      seenRoundStart.add(gameNumber)
      break
    }
    case 'round win':
      lastRoundStart.delete(gameNumber)
      events.emit('match:roundWon', { gameNumber, winner: event.winner })
      break
    case 'round stalemate':
      // a stalemate ends a round with no Round_Win line; clear the remembered
      // Round_Start so the next one is not mistaken for a restart doubling
      lastRoundStart.delete(gameNumber)
      break
    case 'round length':
      events.emit('match:roundLength', { gameNumber, lengthMs: event.lengthMs })
      break
    case 'game over':
      lastRoundStart.delete(gameNumber)
      seenRoundStart.delete(gameNumber)
      events.emit('match:ended', { gameNumber })
      break
    case 'logs uploaded':
      events.emit('match/logs:uploaded', { gameNumber, logsUrl: event.logsUrl })
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
    case 'score reported':
      events.emit('match/score:reported', { gameNumber, teamName: event.team, score: event.score })
      break
    case 'final score reported':
      events.emit('match/score:final', { gameNumber, team: event.team, score: event.score })
      break
    case 'point captured':
      events.emit('match/controlPoint:captured', {
        gameNumber,
        team: event.team,
        controlPoint: event.controlPoint,
      })
      break
    case 'demo uploaded':
      events.emit('match/demo:uploaded', { gameNumber, demoUrl: event.demoUrl })
      break
    case 'player said':
      events.emit('match/player:said', {
        gameNumber,
        steamId: event.steamId,
        message: event.message,
      })
      break
    case 'invalid player':
      break
  }
}

const eventCounter = meter.createCounter('tf2pickup.games.events.count', {
  description: 'Game events that come from the gameserver',
  unit: '1',
  valueType: ValueType.INT,
})

type EventHandledResult =
  | {
      handled: true
      gameNumber: GameNumber
    }
  | {
      handled: false
    }

async function testForGameEvent(message: string, logSecret: string): Promise<EventHandledResult> {
  const event = decodeLogLine(message)
  if (event === null) {
    return { handled: false }
  }

  const game = await collections.games.findOne({ logSecret }, { projection: { number: 1 } })
  if (game === null) {
    logger.error({ message }, `error handling game event: no such game`)
    return { handled: false }
  }
  handle(game.number, event)
  return { handled: true, gameNumber: game.number }
}

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    // each line awaits a game lookup before it emits; serialize per log secret
    // so a game's events are emitted in log line order
    const exclusive = keyedMutex()

    events.on('gamelog:message', async ({ message }) => {
      const result = await exclusive(message.password, () =>
        testForGameEvent(message.payload, message.password),
      )
      eventCounter.add(1, {
        'tf2pickup.games.event.handled': result.handled,
        ...(result.handled ? { 'tf2pickup.game.number': result.gameNumber } : {}),
      })
    })
  },
  {
    name: 'match event listener',
    encapsulate: true,
  },
)
