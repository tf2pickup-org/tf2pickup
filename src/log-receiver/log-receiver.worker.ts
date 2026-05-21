import { NodeSDK } from '@opentelemetry/sdk-node'
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto'
import { metrics, ValueType } from '@opentelemetry/api'
import { createSocket } from 'node:dgram'
import { parentPort } from 'node:worker_threads'
import { MongoClient, MongoError } from 'mongodb'
import SteamID from 'steamid'
import { environment } from '../environment'
import { version } from '../version'
import { parseLogMessage } from './parse-log-message'
import { LogMessageQueue } from '../games/log-message-queue'
import { hideIpAddresses } from '../utils/hide-ip-addresses'
import type { WorkerMessage, ControlMessage } from './worker-message'
import type { GameNumber } from '../database/models/game.model'
import type { GameLogsModel } from '../database/models/game-logs.model'
import type { SteamId64 } from '../shared/types/steam-id-64'
import type { Tf2Team } from '../shared/types/tf2-team'

if (!parentPort) {
  throw new Error('log-receiver.worker must be run as a worker thread')
}

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: process.env['OTEL_SERVICE_NAME'] ?? 'tf2pickup.org',
    [ATTR_SERVICE_VERSION]: version,
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter(),
  }),
})
sdk.start()

const meter = metrics.getMeter('tf2pickup.server', version)
const messageCount = meter.createCounter('tf2pickup.log_receiver.message.count', {
  description: 'Messages coming to the log receiver',
  unit: '1',
})
const eventCount = meter.createCounter('tf2pickup.games.events.count', {
  description: 'Game events that come from the gameserver',
  unit: '1',
  valueType: ValueType.INT,
})

const mongoClient = new MongoClient(environment.MONGODB_URI)
await mongoClient.connect()
const db = mongoClient.db()
const gameLogs = db.collection<GameLogsModel>('gamelogs')
const games = db.collection<{ number: GameNumber; logSecret?: string }>('games')

const logQueue = new LogMessageQueue()

const fixTeamName = (teamName: string): Tf2Team => teamName.toLowerCase().substring(0, 3) as Tf2Team

interface WorkerGameEvent {
  name: string
  keyword: string
  regex: RegExp
  buildMessage: (gameNumber: GameNumber, matches: RegExpMatchArray) => WorkerMessage | null
}

const gameEvents: WorkerGameEvent[] = [
  {
    name: 'match started',
    keyword: 'Round_Start',
    regex: /^[\d/\s-:]+World triggered "Round_Start"$/,
    buildMessage: gameNumber => ({ type: 'match:started', gameNumber }),
  },
  {
    name: 'game restarted',
    keyword: 'exec etf2l',
    regex: /^\d{2}\/\d{2}\/\d{4}\s-\s\d{2}:\d{2}:\d{2}:\srcon from ".+": command "exec etf2l_.+"$/,
    buildMessage: gameNumber => ({ type: 'match:restarted', gameNumber }),
  },
  {
    name: 'round win',
    keyword: 'Round_Win',
    regex:
      /^\d{2}\/\d{2}\/\d{4}\s-\s\d{2}:\d{2}:\d{2}:\sWorld triggered "Round_Win" \(winner "(.+)"\)$/,
    buildMessage: (gameNumber, matches) => {
      if (!matches[1]) return null
      return { type: 'match:roundWon', gameNumber, winner: fixTeamName(matches[1]) }
    },
  },
  {
    name: 'round length',
    keyword: 'Round_Length',
    regex:
      /^\d{2}\/\d{2}\/\d{4}\s-\s\d{2}:\d{2}:\d{2}:\sWorld triggered "Round_Length" \(seconds "([\d.]+)"\)$/,
    buildMessage: (gameNumber, matches) => {
      if (!matches[1]) return null
      return { type: 'match:roundLength', gameNumber, lengthMs: parseFloat(matches[1]) * 1000 }
    },
  },
  {
    name: 'match ended',
    keyword: 'Game_Over',
    regex: /^[\d/\s-:]+World triggered "Game_Over" reason ".*"$/,
    buildMessage: gameNumber => ({ type: 'match:ended', gameNumber }),
  },
  {
    name: 'logs uploaded',
    keyword: 'logs.tf',
    regex: /^[\d/\s-:]+\[TFTrue\].+\shttp:\/\/logs\.tf\/(\d+)\..*$/,
    buildMessage: (gameNumber, matches) => {
      if (!matches[1]) return null
      return { type: 'match/logs:uploaded', gameNumber, logsUrl: `http://logs.tf/${matches[1]}` }
    },
  },
  {
    name: 'player connected',
    keyword: 'connected, address',
    regex:
      /^(\d{2}\/\d{2}\/\d{4})\s-\s(\d{2}:\d{2}:\d{2}):\s"(.+)<(\d+)><(\[.[^\]]+\])><>"\sconnected,\saddress\s"(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d{1,5})"$/,
    buildMessage: (gameNumber, matches) => {
      if (!matches[5] || !matches[6]) return null
      const steamId = new SteamID(matches[5])
      if (!steamId.isValid()) return null
      return {
        type: 'match/player:connected',
        gameNumber,
        steamId: steamId.getSteamID64() as SteamId64,
        ipAddress: matches[6],
      }
    },
  },
  {
    name: 'player joined team',
    keyword: 'joined team',
    regex:
      /^(\d{2}\/\d{2}\/\d{4})\s-\s(\d{2}:\d{2}:\d{2}):\s"(.+)<(\d+)><(\[.[^\]]+\])><(.+)>"\sjoined\steam\s"(.+)"/,
    buildMessage: (gameNumber, matches) => {
      if (!matches[5] || !matches[7]) return null
      const steamId = new SteamID(matches[5])
      if (!steamId.isValid()) return null
      return {
        type: 'match/player:joinedTeam',
        gameNumber,
        steamId: steamId.getSteamID64() as SteamId64,
        team: fixTeamName(matches[7]),
      }
    },
  },
  {
    name: 'player disconnected',
    keyword: 'disconnected',
    regex:
      /^(\d{2}\/\d{2}\/\d{4})\s-\s(\d{2}:\d{2}:\d{2}):\s"(.+)<(\d+)><(\[.[^\]]+\])><(.[^>]+)>"\sdisconnected\s\(reason\s"(.[^"]+)"\)$/,
    buildMessage: (gameNumber, matches) => {
      if (!matches[5]) return null
      const steamId = new SteamID(matches[5])
      if (!steamId.isValid()) return null
      return {
        type: 'match/player:disconnected',
        gameNumber,
        steamId: steamId.getSteamID64() as SteamId64,
      }
    },
  },
  {
    name: 'score reported',
    keyword: 'current score',
    regex: /^[\d/\s\-:]+Team "(.[^"]+)" current score "(\d)" with "(\d)" players$/,
    buildMessage: (gameNumber, matches) => {
      const [, teamName, score] = matches
      if (!teamName || !score) return null
      return {
        type: 'match/score:reported',
        gameNumber,
        teamName: fixTeamName(teamName),
        score: Number(score),
      }
    },
  },
  {
    name: 'final score reported',
    keyword: 'final score',
    regex: /^[\d/\s\-:]+Team "(.[^"]+)" final score "(\d)" with "(\d)" players$/,
    buildMessage: (gameNumber, matches) => {
      const [, teamName, score] = matches
      if (!teamName || !score) return null
      return {
        type: 'match/score:final',
        gameNumber,
        team: fixTeamName(teamName),
        score: Number(score),
      }
    },
  },
  {
    name: 'demo uploaded',
    keyword: '[demos.tf]',
    regex: /^[\d/\s-:]+\[demos\.tf\]:\sSTV\savailable\sat:\s(.+)$/,
    buildMessage: (gameNumber, matches) => {
      if (!matches[1]) return null
      return { type: 'match/demo:uploaded', gameNumber, demoUrl: matches[1] }
    },
  },
  {
    name: 'player said',
    keyword: '" say "',
    regex:
      /^(\d{2}\/\d{2}\/\d{4})\s-\s(\d{2}:\d{2}:\d{2}):\s"(.+)<(\d+)><(\[.[^\]]+\])><(.[^>]+)>"\ssay\s"(.+)"$/,
    buildMessage: (gameNumber, matches) => {
      if (!matches[5] || !matches[7]) return null
      const steamId = new SteamID(matches[5])
      if (!steamId.isValid()) return null
      return {
        type: 'match/player:said',
        gameNumber,
        steamId: steamId.getSteamID64() as SteamId64,
        message: matches[7],
      }
    },
  },
]

async function pushLogMessage(payload: string, logSecret: string): Promise<void> {
  const logLine = hideIpAddresses(payload)
  try {
    await gameLogs.findOneAndUpdate({ logSecret }, { $push: { logs: logLine } }, { upsert: true })
  } catch (error) {
    if (!(error instanceof MongoError)) throw error
    if (error.code === 11000) {
      await gameLogs.findOneAndUpdate({ logSecret }, { $push: { logs: logLine } }, { upsert: true })
    } else {
      throw error
    }
  }
}

async function matchGameEvent(payload: string, logSecret: string): Promise<WorkerMessage | null> {
  for (const gameEvent of gameEvents) {
    if (!payload.includes(gameEvent.keyword)) continue
    const matches = payload.match(gameEvent.regex)
    if (!matches) continue

    const game = await games.findOne({ logSecret }, { projection: { number: 1 } })
    if (!game) return null

    const message = gameEvent.buildMessage(game.number, matches)
    if (!message) return null

    if (message.type === 'match:restarted') {
      logQueue.clear(logSecret)
      await gameLogs.deleteOne({ logSecret })
    }

    return message
  }
  return null
}

const socket = createSocket('udp4')

socket.on('message', (message, rinfo) => {
  try {
    messageCount.add(1, { source_ip: rinfo.address })
    const logMessage = parseLogMessage(message)

    logQueue.enqueue(logMessage.password, () =>
      pushLogMessage(logMessage.payload, logMessage.password),
    )

    matchGameEvent(logMessage.payload, logMessage.password).then(
      workerMessage => {
        if (workerMessage) {
          parentPort!.postMessage(workerMessage)
          eventCount.add(1, {
            'tf2pickup.games.event.handled': true,
            'tf2pickup.game.number': workerMessage.gameNumber,
          })
        } else {
          eventCount.add(1, { 'tf2pickup.games.event.handled': false })
        }
      },
      () => {
        eventCount.add(1, { 'tf2pickup.games.event.handled': false })
      },
    )
  } catch {
    // invalid message, ignore
  }
})

socket.on('listening', () => {
  const address = socket.address()
  console.log(`log receiver worker listening at ${address.address}:${address.port}`)
})

socket.bind(environment.LOG_RELAY_PORT, '0.0.0.0')

parentPort.on('message', async (msg: ControlMessage) => {
  if (msg.type === 'shutdown') {
    socket.close()
    await mongoClient.close()
    await sdk.shutdown()
    process.exit(0)
  }
})
