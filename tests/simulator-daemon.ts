// Runs simulated game servers as a long-lived process for the AI playground
// (https://github.com/tf2pickup-org/ai-playground). Each server registers itself via heartbeats
// and can either play games on its own (autoplay) or be driven through a small HTTP API:
//
//   GET  /servers                     list servers and their state
//   POST /servers/:n/autoplay         body {"enabled": boolean}
//   POST /servers/:n/:action          body: JSON array of the action's arguments, e.g.
//                                     ["playerName"] for playerConnects, ["blu"] for roundEnds
//
// With CONTROL_TOKEN set, every request needs an "Authorization: Bearer <token>" header.
//
// MANUAL_PLAYERS (steamIds, comma-separated) are left to connect on their own through the API, the
// way a real player joins the server: autoplay connects everyone else and starts the match once
// each of them has connected or been substituted.
import { createServer, type IncomingMessage } from 'node:http'
import { timingSafeEqual } from 'node:crypto'
import { minutesToMilliseconds, secondsToMilliseconds } from 'date-fns'
import { delay } from 'es-toolkit'
import { GameServerSimulator } from './game-server-simulator'

function requireEnv(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} must be set`)
  }
  return value
}

const apiAddress = requireEnv('API_URL')
const secret = requireEnv('GAME_SERVER_SECRET')
const publicAddress = requireEnv('SIMULATOR_PUBLIC_ADDRESS')
const rconPassword = requireEnv('SIMULATOR_RCON_PASSWORD')
const count = Number(process.env['SIMULATOR_COUNT'] ?? 2)
const basePort = Number(process.env['SIMULATOR_BASE_PORT'] ?? 27015)
// real srcds occupies a few ports next to its own, so servers are usually spaced by 5
const portStep = Number(process.env['SIMULATOR_PORT_STEP'] ?? 5)
const controlHost = process.env['CONTROL_HOST'] ?? '127.0.0.1'
const controlPort = Number(process.env['CONTROL_PORT'] ?? 8080)
const roundLength = secondsToMilliseconds(Number(process.env['AUTOPLAY_ROUND_SECONDS'] ?? 30))
const winLimit = Number(process.env['AUTOPLAY_WIN_LIMIT'] ?? 3)
const manualPlayers = process.env['MANUAL_PLAYERS']?.split(',').filter(Boolean) ?? []
const controlToken = process.env['CONTROL_TOKEN']

function authorized(request: IncomingMessage) {
  if (!controlToken) {
    return true
  }
  const expected = Buffer.from(`Bearer ${controlToken}`)
  const actual = Buffer.from(request.headers.authorization ?? '')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

const actions = [
  'connectAllPlayers',
  'playerConnects',
  'playerJoinsTeam',
  'playerDisconnects',
  'matchStarts',
  'matchRestarts',
  'roundEnds',
  'matchEnds',
] as const
type Action = (typeof actions)[number]

interface Slot {
  simulator: GameServerSimulator
  autoplay: boolean
  playing: boolean
}

const slots: Slot[] = []
for (let i = 0; i < count; ++i) {
  const simulator = new GameServerSimulator(apiAddress, secret, {
    port: basePort + i * portStep,
    address: publicAddress,
    rconPassword,
    name: `AI playground #${i + 1}`,
  })
  await simulator.run()
  slots.push({ simulator, autoplay: true, playing: false })
}

async function heartbeat() {
  for (const { simulator } of slots) {
    await simulator.sendHeartbeat().catch((error: unknown) => {
      console.error(`heartbeat failed for port ${simulator.port}`, error)
    })
  }
}

await heartbeat()
setInterval(() => void heartbeat(), minutesToMilliseconds(1))

// The app adds the roster player by player; wait until it stops changing before playing.
async function waitForStableRoster(simulator: GameServerSimulator) {
  let size = -1
  while (simulator.addedPlayers.length !== size) {
    size = simulator.addedPlayers.length
    await delay(secondsToMilliseconds(5))
  }
}

async function play(slot: Slot) {
  const { simulator } = slot
  const interrupted = () => !slot.autoplay || simulator.addedPlayers.length === 0
  await waitForStableRoster(simulator)
  if (interrupted()) {
    return
  }

  const connectBots = async () => {
    for (const player of simulator.addedPlayers.filter(
      player => !player.connected && !manualPlayers.includes(player.steamId64),
    )) {
      await simulator.playerConnects(player.name)
      await simulator.playerJoinsTeam(player.name)
    }
  }
  // substitutes are bots too, so this also connects whoever replaced a player who never showed up
  while (simulator.addedPlayers.some(player => !player.connected)) {
    await connectBots()
    await delay(secondsToMilliseconds(5))
    if (interrupted()) {
      return
    }
  }
  await simulator.matchStarts()
  const score = { blu: 0, red: 0 }
  while (score.blu < winLimit && score.red < winLimit) {
    await delay(roundLength)
    if (interrupted()) {
      return
    }

    await connectBots()

    const winner = Math.random() < 0.5 ? 'blu' : 'red'
    score[winner] += 1
    await simulator.roundEnds(winner)
  }
  await simulator.matchEnds()
}

setInterval(() => {
  for (const slot of slots) {
    if (slot.simulator.addedPlayers.length === 0) {
      slot.playing = false
    } else if (slot.autoplay && !slot.playing) {
      slot.playing = true
      play(slot).catch((error: unknown) => {
        console.error(`autoplay failed for port ${slot.simulator.port}`, error)
      })
    }
  }
}, secondsToMilliseconds(1))

async function readJson(request: IncomingMessage): Promise<unknown> {
  let body = ''
  for await (const chunk of request) {
    body += String(chunk)
  }
  return body ? JSON.parse(body) : undefined
}

createServer((request, response) => {
  const reply = (status: number, body?: unknown) => {
    response.writeHead(status, { 'Content-Type': 'application/json' })
    response.end(body === undefined ? undefined : JSON.stringify(body))
  }

  const run = async () => {
    if (!authorized(request)) {
      reply(401)
      return
    }
    const path = new URL(request.url ?? '/', 'http://localhost').pathname
    if (request.method === 'GET' && path === '/servers') {
      reply(
        200,
        slots.map(({ simulator, autoplay, playing }, n) => ({
          n,
          port: simulator.port,
          autoplay,
          playing,
          players: simulator.addedPlayers.map(
            ({ steamId64, name, team, gameClass, connected }) => ({
              steamId64,
              name,
              team,
              gameClass,
              connected,
            }),
          ),
        })),
      )
      return
    }

    const [, n, action] = /^\/servers\/(\d+)\/(\w+)$/.exec(path) ?? []
    const slot = slots[Number(n)]
    if (request.method !== 'POST' || !slot || !action) {
      reply(404)
      return
    }

    const body = await readJson(request)
    if (action === 'autoplay') {
      slot.autoplay = (body as { enabled?: unknown } | undefined)?.enabled === true
      reply(200, { autoplay: slot.autoplay })
      return
    }

    if (!actions.includes(action as Action)) {
      reply(404)
      return
    }

    const args = Array.isArray(body) ? (body as string[]) : []
    const method = slot.simulator[action as Action].bind(slot.simulator) as (
      ...args: string[]
    ) => Promise<void>
    await method(...args)
    reply(204)
  }

  run().catch((error: unknown) => {
    reply(400, { error: String(error) })
  })
}).listen(controlPort, controlHost, () => {
  console.log(
    `${count} simulated game servers on ports ${slots.map(({ simulator }) => simulator.port).join(', ')}, control API on ${controlHost}:${controlPort}`,
  )
})
