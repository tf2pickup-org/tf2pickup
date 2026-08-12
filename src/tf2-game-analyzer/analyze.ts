import { differenceInSeconds, parse } from 'date-fns'
import SteamID from 'steamid'
import { Tf2Team } from '../shared/types/tf2-team'
import type { SteamId64 } from '../shared/types/steam-id-64'
// TODO: move is-stopwatch-round into this module when tf2-game-analyzer is extracted;
// for now we reuse the app's copy.
import { isStopwatchRound } from '../games/is-stopwatch-round'
import type { GameContext } from './game-context'
import type { LogEvent } from './log-event'

// converts 'Red' and 'Blue' to valid team names
const fixTeamName = (teamName: string): Tf2Team => teamName.toLowerCase().substring(0, 3) as Tf2Team

const parseLogTimestamp = (timestamp: string) =>
  parse(timestamp, 'MM/dd/yyyy - HH:mm:ss', new Date())

function ensureRound(context: GameContext): NonNullable<GameContext['round']> {
  context.round ??= { captures: { [Tf2Team.red]: [], [Tf2Team.blu]: [] } }
  return context.round
}

// Commit the round in progress if all its parts have arrived (winner, length and
// both teams' scores). Returns the `round ended` event, or nothing if the round
// is still incomplete or its score matches what we already have.
function maybeRoundEnded(context: GameContext): LogEvent[] {
  const round = context.round
  if (!round) {
    return []
  }
  const blu = round.score?.[Tf2Team.blu]
  const red = round.score?.[Tf2Team.red]
  if (
    round.winner === undefined ||
    round.lengthMs === undefined ||
    blu === undefined ||
    red === undefined
  ) {
    return []
  }

  const { winner, lengthMs } = round
  const score: Record<Tf2Team, number> = { [Tf2Team.blu]: blu, [Tf2Team.red]: red }
  const captures: Record<Tf2Team, number[]> = {
    [Tf2Team.blu]: round.captures[Tf2Team.blu],
    [Tf2Team.red]: round.captures[Tf2Team.red],
  }

  // the round is consumed whether or not it changes the score
  context.round = undefined

  if (
    score[Tf2Team.red] === context.score[Tf2Team.red] &&
    score[Tf2Team.blu] === context.score[Tf2Team.blu]
  ) {
    return []
  }

  // On stopwatch (attack/defend & payload) maps TF2 switches the teams' sides
  // afterwards. Defer the swap to the next round start so the final round
  // doesn't produce a trailing swap.
  if (isStopwatchRound({ previousScore: context.score, score, captures })) {
    context.swapPending = true
    context.isStopwatch = true
  }

  context.score = { [Tf2Team.red]: score[Tf2Team.red], [Tf2Team.blu]: score[Tf2Team.blu] }

  return [{ event: 'round ended', winner, lengthMs, score, captures }]
}

interface Matcher {
  regex: RegExp
  handle: (context: GameContext, matches: RegExpMatchArray) => LogEvent[]
}

const matchers: Matcher[] = [
  {
    // TF2 logs Round_Start once per regular round, but twice within the same
    // second (occasionally straddling a second boundary) when a tournament match
    // (re)starts. A regular round transition always has a Round_Win or a
    // Round_Stalemate between two Round_Starts (both clear the remembered line),
    // so a pair ≤1s apart can only be the (re)start doubling. The pair at the
    // initial match start is expected; a pair preceded by an earlier Round_Start
    // means the match was restarted mid-game and the server reset its scoreboard.
    regex: /^(\d{2}\/\d{2}\/\d{4}\s-\s\d{2}:\d{2}:\d{2}):\sWorld triggered "Round_Start"$/,
    handle: (context, matches) => {
      const events: LogEvent[] = []
      if (context.swapPending) {
        context.swapPending = false
        events.push({ event: 'teams swapped' })
      }
      events.push({ event: 'round started' })

      if (matches[1]) {
        const at = parseLogTimestamp(matches[1])
        const last = context.lastRoundStart
        if (last && Math.abs(differenceInSeconds(at, new Date(last.at))) <= 1) {
          if (last.precededByRoundStart) {
            context.lastRoundStart = undefined
            context.round = undefined
            context.swapPending = false
            context.score = { [Tf2Team.red]: 0, [Tf2Team.blu]: 0 }
            events.push({ event: 'score reset' })
          }
        } else {
          context.lastRoundStart = {
            at: at.toISOString(),
            precededByRoundStart: context.seenRoundStart,
          }
        }
      }
      context.seenRoundStart = true
      return events
    },
  },
  {
    regex:
      /^\d{2}\/\d{2}\/\d{4}\s-\s\d{2}:\d{2}:\d{2}:\sWorld triggered "Round_Win" \(winner "(.+)"\)$/,
    handle: (context, matches) => {
      context.lastRoundStart = undefined
      if (!matches[1]) {
        return []
      }
      ensureRound(context).winner = fixTeamName(matches[1])
      return maybeRoundEnded(context)
    },
  },
  {
    // a stalemate ends a round with no Round_Win line; clear the remembered
    // Round_Start so the next one is not mistaken for a restart doubling
    regex: /^\d{2}\/\d{2}\/\d{4}\s-\s\d{2}:\d{2}:\d{2}:\sWorld triggered "Round_Stalemate"$/,
    handle: context => {
      context.lastRoundStart = undefined
      return []
    },
  },
  {
    // payload/attack-defend maps emit "Mini_Round_Length" instead of "Round_Length"
    regex:
      /^\d{2}\/\d{2}\/\d{4}\s-\s\d{2}:\d{2}:\d{2}:\sWorld triggered "(?:Mini_)?Round_Length" \(seconds "([\d.]+)"\)$/,
    handle: (context, matches) => {
      if (!matches[1]) {
        return []
      }
      ensureRound(context).lengthMs = parseFloat(matches[1]) * 1000
      return maybeRoundEnded(context)
    },
  },
  {
    regex: /^[\d/\s-:]+World triggered "Game_Over" reason ".*"$/,
    handle: context => {
      context.lastRoundStart = undefined
      context.seenRoundStart = false
      context.round = undefined
      return [{ event: 'match ended' }]
    },
  },
  {
    regex: /^[\d/\s-:]+\[TFTrue\].+\shttp:\/\/logs\.tf\/(\d+)\..*$/,
    handle: (_context, matches) => {
      if (!matches[1]) {
        return []
      }
      return [{ event: 'logs uploaded', logsUrl: `http://logs.tf/${matches[1]}` }]
    },
  },
  {
    regex:
      /^(\d{2}\/\d{2}\/\d{4})\s-\s(\d{2}:\d{2}:\d{2}):\s"(.+)<(\d+)><(\[.[^\]]+\])><>"\sconnected,\saddress\s"(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d{1,5})"$/,
    handle: (_context, matches) => {
      if (!matches[5] || !matches[6]) {
        return []
      }
      const steamId = new SteamID(matches[5])
      if (!steamId.isValid()) {
        return []
      }
      return [
        {
          event: 'player connected',
          steamId: steamId.getSteamID64() as SteamId64,
          ipAddress: matches[6],
        },
      ]
    },
  },
  {
    regex:
      /^(\d{2}\/\d{2}\/\d{4})\s-\s(\d{2}:\d{2}:\d{2}):\s"(.+)<(\d+)><(\[.[^\]]+\])><(.+)>"\sjoined\steam\s"(.+)"/,
    handle: (_context, matches) => {
      if (!matches[5] || !matches[7]) {
        return []
      }
      const steamId = new SteamID(matches[5])
      if (!steamId.isValid()) {
        return []
      }
      return [
        {
          event: 'player joined team',
          steamId: steamId.getSteamID64() as SteamId64,
          team: fixTeamName(matches[7]),
        },
      ]
    },
  },
  {
    regex:
      /^(\d{2}\/\d{2}\/\d{4})\s-\s(\d{2}:\d{2}:\d{2}):\s"(.+)<(\d+)><(\[.[^\]]+\])><(.[^>]+)>"\sdisconnected\s\(reason\s"(.[^"]+)"\)$/,
    handle: (_context, matches) => {
      if (!matches[5] || !matches[6]) {
        return []
      }
      const steamId = new SteamID(matches[5])
      if (!steamId.isValid()) {
        return []
      }
      return [{ event: 'player disconnected', steamId: steamId.getSteamID64() as SteamId64 }]
    },
  },
  {
    regex: /^[\d/\s\-:]+Team "(.[^"]+)" current score "(\d)" with "(\d)" players$/,
    handle: (context, matches) => {
      const [, teamName, score] = matches
      if (!teamName || score === undefined) {
        return []
      }
      const round = ensureRound(context)
      round.score = { ...round.score, [fixTeamName(teamName)]: Number(score) }
      return maybeRoundEnded(context)
    },
  },
  {
    regex: /^[\d/\s\-:]+Team "(.[^"]+)" final score "(\d)" with "(\d)" players$/,
    handle: (_context, matches) => {
      const [, teamName, score] = matches
      if (!teamName || score === undefined) {
        return []
      }
      return [{ event: 'final score', team: fixTeamName(teamName), score: Number(score) }]
    },
  },
  {
    regex: /^[\d/\s\-:]+Team "(.[^"]+)" triggered "pointcaptured" \(cp "(\d+)"\)/,
    handle: (context, matches) => {
      const [, teamName, controlPoint] = matches
      if (!teamName || controlPoint === undefined) {
        return []
      }
      ensureRound(context).captures[fixTeamName(teamName)].push(Number(controlPoint))
      return []
    },
  },
  {
    regex: /^[\d/\s-:]+\[demos\.tf\]:\sSTV\savailable\sat:\s(.+)$/,
    handle: (_context, matches) => {
      if (!matches[1]) {
        return []
      }
      return [{ event: 'demo uploaded', demoUrl: matches[1] }]
    },
  },
  {
    regex:
      /^(\d{2}\/\d{2}\/\d{4})\s-\s(\d{2}:\d{2}:\d{2}):\s"(.+)<(\d+)><(\[.[^\]]+\])><(.[^>]+)>"\ssay\s"(.+)"$/,
    handle: (_context, matches) => {
      if (!matches[5] || !matches[7]) {
        return []
      }
      const steamId = new SteamID(matches[5])
      if (!steamId.isValid()) {
        return []
      }
      return [
        {
          event: 'player said',
          steamId: steamId.getSteamID64() as SteamId64,
          message: matches[7],
        },
      ]
    },
  },
]

/**
 * Interpret a single TF2 game log line, updating `context` in place and
 * returning the game events the line produced (empty if the line is not
 * recognized). Call it once per line, strictly in order, per game.
 */
export function analyze(context: GameContext, line: string): LogEvent[] {
  for (const matcher of matchers) {
    const matches = line.match(matcher.regex)
    if (matches) {
      return matcher.handle(context, matches)
    }
  }
  return []
}
