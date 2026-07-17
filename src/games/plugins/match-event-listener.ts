import fp from 'fastify-plugin'
import { differenceInSeconds, parse } from 'date-fns'
import type { GameNumber } from '../../database/models/game.model'
import { events } from '../../events'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import type { Tf2Team } from '../../shared/types/tf2-team'
import SteamID from 'steamid'
import { collections } from '../../database/collections'
import { logger } from '../../logger'
import { meter } from '../../otel'
import { ValueType } from '@opentelemetry/api'

interface GameEvent {
  /* name of the game event */
  name: string

  /* the event is triggered if a log line matches this regex */
  regex: RegExp

  /* handle the event being triggered */
  handle: (number: GameNumber, matches: RegExpMatchArray) => void
}

// converts 'Red' and 'Blue' to valid team names
const fixTeamName = (teamName: string): Tf2Team => teamName.toLowerCase().substring(0, 3) as Tf2Team

// the last Round_Start line seen per game (cleared when a round ends with a
// win or a stalemate) and whether any Round_Start was seen at all this match;
// used to detect the doubled Round_Start below
const lastRoundStart = new Map<GameNumber, { at: Date; precededByRoundStart: boolean }>()
const seenRoundStart = new Set<GameNumber>()

const parseLogTimestamp = (timestamp: string) =>
  parse(timestamp, 'MM/dd/yyyy - HH:mm:ss', new Date())

const gameEvents: GameEvent[] = [
  {
    // TODO rename to "round start"
    name: 'match started',
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
    regex: /^(\d{2}\/\d{2}\/\d{4}\s-\s\d{2}:\d{2}:\d{2}):\sWorld triggered "Round_Start"$/,
    handle: (gameNumber, matches) => {
      events.emit('match:started', { gameNumber })
      if (!matches[1]) {
        return
      }
      const at = parseLogTimestamp(matches[1])
      const last = lastRoundStart.get(gameNumber)
      if (last && Math.abs(differenceInSeconds(at, last.at)) <= 1) {
        if (last.precededByRoundStart) {
          lastRoundStart.delete(gameNumber)
          events.emit('match/score:reset', { gameNumber })
        }
      } else {
        lastRoundStart.set(gameNumber, {
          at,
          precededByRoundStart: seenRoundStart.has(gameNumber),
        })
      }
      seenRoundStart.add(gameNumber)
    },
  },
  {
    name: 'round win',
    // https://regex101.com/r/41LfKS/2
    regex:
      /^\d{2}\/\d{2}\/\d{4}\s-\s\d{2}:\d{2}:\d{2}:\sWorld triggered "Round_Win" \(winner "(.+)"\)$/,
    handle: (gameNumber, matches) => {
      lastRoundStart.delete(gameNumber)
      if (matches[1]) {
        const winner = fixTeamName(matches[1])
        events.emit('match:roundWon', { gameNumber, winner })
      }
    },
  },
  {
    name: 'round stalemate',
    // a stalemate ends a round with no Round_Win line; clear the remembered
    // Round_Start so the next one is not mistaken for a restart doubling
    regex: /^\d{2}\/\d{2}\/\d{4}\s-\s\d{2}:\d{2}:\d{2}:\sWorld triggered "Round_Stalemate"$/,
    handle: gameNumber => {
      lastRoundStart.delete(gameNumber)
    },
  },
  {
    name: 'round length',
    // payload/attack-defend maps emit "Mini_Round_Length" instead of "Round_Length"
    // https://regex101.com/r/mvOYMz/3
    regex:
      /^\d{2}\/\d{2}\/\d{4}\s-\s\d{2}:\d{2}:\d{2}:\sWorld triggered "(?:Mini_)?Round_Length" \(seconds "([\d.]+)"\)$/,
    handle: (gameNumber, matches) => {
      if (matches[1]) {
        const seconds = parseFloat(matches[1])
        events.emit('match:roundLength', { gameNumber, lengthMs: seconds * 1000 })
      }
    },
  },
  {
    // TODO rename to "game over"
    name: 'match ended',
    regex: /^[\d/\s-:]+World triggered "Game_Over" reason ".*"$/,
    handle: gameNumber => {
      lastRoundStart.delete(gameNumber)
      seenRoundStart.delete(gameNumber)
      events.emit('match:ended', { gameNumber })
    },
  },
  {
    name: 'logs uploaded',
    regex: /^[\d/\s-:]+\[TFTrue\].+\shttp:\/\/logs\.tf\/(\d+)\..*$/,
    handle: (gameNumber, matches) => {
      const logsUrl = `http://logs.tf/${matches[1]}`
      events.emit('match/logs:uploaded', { gameNumber, logsUrl })
    },
  },
  {
    name: 'player connected',
    // https://regex101.com/r/uyPW8m/5
    regex:
      /^(\d{2}\/\d{2}\/\d{4})\s-\s(\d{2}:\d{2}:\d{2}):\s"(.+)<(\d+)><(\[.[^\]]+\])><>"\sconnected,\saddress\s"(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d{1,5})"$/,
    handle: (gameNumber, matches) => {
      if (!matches[5] || !matches[6]) {
        return
      }
      const steamId = new SteamID(matches[5])
      if (steamId.isValid()) {
        events.emit('match/player:connected', {
          gameNumber,
          steamId: steamId.getSteamID64() as SteamId64,
          ipAddress: matches[6],
        })
      }
    },
  },
  {
    name: 'player joined team',
    // https://regex101.com/r/yzX9zG/1
    regex:
      /^(\d{2}\/\d{2}\/\d{4})\s-\s(\d{2}:\d{2}:\d{2}):\s"(.+)<(\d+)><(\[.[^\]]+\])><(.+)>"\sjoined\steam\s"(.+)"/,
    handle: (gameNumber, matches) => {
      if (!matches[5] || !matches[7]) {
        return
      }
      const steamId = new SteamID(matches[5])
      if (steamId.isValid()) {
        events.emit('match/player:joinedTeam', {
          gameNumber,
          steamId: steamId.getSteamID64() as SteamId64,
          team: fixTeamName(matches[7]),
        })
      }
    },
  },
  {
    name: 'player disconnected',
    // https://regex101.com/r/x4AMTG/1
    regex:
      /^(\d{2}\/\d{2}\/\d{4})\s-\s(\d{2}:\d{2}:\d{2}):\s"(.+)<(\d+)><(\[.[^\]]+\])><(.[^>]+)>"\sdisconnected\s\(reason\s"(.[^"]+)"\)$/,
    handle: (gameNumber, matches) => {
      if (!matches[5] || !matches[6]) {
        return
      }
      const steamId = new SteamID(matches[5])
      if (steamId.isValid()) {
        events.emit('match/player:disconnected', {
          gameNumber,
          steamId: steamId.getSteamID64() as SteamId64,
        })
      }
    },
  },
  {
    name: 'score reported',
    // https://regex101.com/r/ZD6eLb/1
    regex: /^[\d/\s\-:]+Team "(.[^"]+)" current score "(\d)" with "(\d)" players$/,
    handle: (gameNumber, matches) => {
      const [, teamName, score] = matches
      if (teamName && score) {
        events.emit('match/score:reported', {
          gameNumber,
          teamName: fixTeamName(teamName),
          score: Number(score),
        })
      }
    },
  },
  {
    name: 'final score reported',
    // https://regex101.com/r/RAUdTe/1
    regex: /^[\d/\s\-:]+Team "(.[^"]+)" final score "(\d)" with "(\d)" players$/,
    handle: (gameNumber, matches) => {
      const [, teamName, score] = matches
      if (teamName && score) {
        events.emit('match/score:final', {
          gameNumber,
          team: fixTeamName(teamName),
          score: Number(score),
        })
      }
    },
  },
  {
    name: 'point captured',
    // https://regex101.com/r/3fJZ4r/1
    regex: /^[\d/\s\-:]+Team "(.[^"]+)" triggered "pointcaptured" \(cp "(\d+)"\)/,
    handle: (gameNumber, matches) => {
      const [, teamName, controlPoint] = matches
      if (teamName && controlPoint) {
        events.emit('match/controlPoint:captured', {
          gameNumber,
          team: fixTeamName(teamName),
          controlPoint: Number(controlPoint),
        })
      }
    },
  },
  {
    name: 'demo uploaded',
    // https://regex101.com/r/JLGRYa/2
    regex: /^[\d/\s-:]+\[demos\.tf\]:\sSTV\savailable\sat:\s(.+)$/,
    handle: (gameNumber, matches) => {
      const demoUrl = matches[1]
      if (demoUrl) {
        events.emit('match/demo:uploaded', { gameNumber, demoUrl })
      }
    },
  },
  {
    name: 'player said',
    // https://regex101.com/r/zpFkkA/1
    regex:
      /^(\d{2}\/\d{2}\/\d{4})\s-\s(\d{2}:\d{2}:\d{2}):\s"(.+)<(\d+)><(\[.[^\]]+\])><(.[^>]+)>"\ssay\s"(.+)"$/,
    handle: (gameNumber, matches) => {
      if (!matches[5] || !matches[7]) {
        return
      }
      const steamId = new SteamID(matches[5])
      if (steamId.isValid()) {
        const message = matches[7]
        events.emit('match/player:said', {
          gameNumber,
          steamId: steamId.getSteamID64() as SteamId64,
          message,
        })
      }
    },
  },
]

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
  for (const gameEvent of gameEvents) {
    const matches = message.match(gameEvent.regex)
    if (matches) {
      const game = await collections.games.findOne({ logSecret }, { projection: { number: 1 } })
      if (game === null) {
        logger.error({ message }, `error handling game event: no such game`)
        return { handled: false }
      }
      gameEvent.handle(game.number, matches)
      return { handled: true, gameNumber: game.number }
    }
  }

  return { handled: false }
}

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on('gamelog:message', async ({ message }) => {
      const result = await testForGameEvent(message.payload, message.password)
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
