import fp from 'fastify-plugin'
import type { GameNumber } from '../database/models/game.model'
import { events } from '../events'
import type { SteamId64 } from '../shared/types/steam-id-64'
import type { Tf2Team } from '../shared/types/tf2-team'
import SteamID from 'steamid'
import { collections } from '../database/collections'
import { logger } from '../logger'

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

const gameEvents: GameEvent[] = [
  {
    // TODO rename to "round start"
    name: 'match started',
    regex: /^[\d/\s-:]+World triggered "Round_Start"$/,
    handle: gameNumber => events.emit('match:started', { gameNumber }),
  },
  {
    name: 'round win',
    // https://regex101.com/r/41LfKS/2
    regex:
      /^\d{2}\/\d{2}\/\d{4}\s-\s\d{2}:\d{2}:\d{2}:\sWorld triggered "Round_Win" \(winner "(.+)"\)$/,
    handle: (gameNumber, matches) => {
      if (matches[1]) {
        const winner = fixTeamName(matches[1])
        events.emit('match:roundWon', { gameNumber, winner })
      }
    },
  },
  {
    name: 'round length',
    // https://regex101.com/r/mvOYMz/3
    regex:
      /^\d{2}\/\d{2}\/\d{4}\s-\s\d{2}:\d{2}:\d{2}:\sWorld triggered "Round_Length" \(seconds "([\d.]+)"\)$/,
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
    handle: gameNumber => events.emit('match:ended', { gameNumber }),
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

async function testForGameEvent(message: string, logSecret: string) {
  for (const gameEvent of gameEvents) {
    const matches = message.match(gameEvent.regex)
    if (matches) {
      const game = await collections.games.findOne({ logSecret })
      if (game === null) {
        logger.warn(`error handling event (${message})`)
        return
      }
      logger.debug(`#${game.number}: ${gameEvent.name}`)
      gameEvent.handle(game.number, matches)
      break
    }
  }
}

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on('gamelog:message', async ({ message }) => {
      await testForGameEvent(message.payload, message.password)
    })
  },
  {
    name: 'match-event-listener',
    encapsulate: true,
  },
)
