import { Rcon } from 'rcon-client'
import { type GameModel } from '../../database/models/game.model'
import { assertIsError } from '../../utils/assert-is-error'
import { logger } from '../../logger'
import { errors } from '../../errors'

const RCON_IDLE_TIMEOUT_MS = 30 * 60 * 1000
interface CachedRconEntry {
  key: string
  rcon: Rcon
  lastCommandAt: number
  idleTimer?: NodeJS.Timeout
  lifecycleCleanups: (() => void)[]
}

const rconCache = new Map<string, CachedRconEntry>()
const pendingConnections = new Map<string, Promise<Rcon>>()

export async function withRcon<T>(
  game: GameModel,
  callback: (args: { rcon: Rcon }) => Promise<T>,
): Promise<T> {
  logger.trace({ gameNumber: game.number }, `withRcon()`)
  if (game.gameServer === undefined) {
    throw errors.internalServerError(`gameServer is undefined`)
  }

  const rcon = await getOrCreateRcon(game)
  return await callback({ rcon })
}

async function getOrCreateRcon(game: GameModel): Promise<Rcon> {
  if (game.gameServer === undefined) {
    throw errors.internalServerError(`gameServer is undefined`)
  }

  const { address, port, password } = game.gameServer.rcon
  const key = buildCacheKey(address, port, password)
  const cached = rconCache.get(key)
  if (cached !== undefined) {
    return cached.rcon
  }

  let connectionPromise = pendingConnections.get(key)
  if (connectionPromise === undefined) {
    connectionPromise = createRconConnection({
      key,
      address,
      port,
      password,
      gameNumber: game.number,
    })
    pendingConnections.set(key, connectionPromise)
  }

  try {
    return await connectionPromise
  } finally {
    pendingConnections.delete(key)
  }
}

async function createRconConnection(args: {
  key: string
  address: string
  port: string
  password: string
  gameNumber: GameModel['number']
}): Promise<Rcon> {
  const rcon = await Rcon.connect({
    host: args.address,
    port: Number(args.port),
    password: args.password,
    timeout: 30000,
  })

  const entry: CachedRconEntry = {
    key: args.key,
    rcon,
    lastCommandAt: Date.now(),
    lifecycleCleanups: [],
  }

  rconCache.set(args.key, entry)
  observeLifecycle(entry, args.gameNumber)
  registerErrorLogging(rcon, args.gameNumber)
  wrapSendWithIdleTracking(entry)

  logger.trace({ gameNumber: args.gameNumber }, `game #${args.gameNumber}: established RCON connection`)
  return rcon
}

function wrapSendWithIdleTracking(entry: CachedRconEntry) {
  const originalSend = entry.rcon.send.bind(entry.rcon)
  const wrappedSend: typeof entry.rcon.send = async (...params) => {
    entry.lastCommandAt = Date.now()
    scheduleIdleCleanup(entry)
    return await originalSend(...params)
  }

  entry.rcon.send = wrappedSend
  scheduleIdleCleanup(entry)
}

function scheduleIdleCleanup(entry: CachedRconEntry) {
  if (entry.idleTimer) {
    clearTimeout(entry.idleTimer)
  }

  entry.idleTimer = setTimeout(() => {
    cleanupConnection(entry.key, entry, { reason: 'idle timeout' })
  }, RCON_IDLE_TIMEOUT_MS)
}

function registerErrorLogging(rcon: Rcon, gameNumber: GameModel['number']) {
  rcon.on('error', error => {
    assertIsError(error)
    logger.error(error, `game #${gameNumber}: rcon error`)
  })
}

function observeLifecycle(entry: CachedRconEntry, gameNumber: GameModel['number']) {
  const handleSocketClosed = () => {
    logger.debug(
      { gameNumber },
      `game #${gameNumber}: RCON connection closed by server via "end"`,
    )
    cleanupConnection(entry.key, entry, { skipClosing: true, reason: 'socket end' })
  }

  entry.lifecycleCleanups = [
    () => {
      entry.rcon.off('end', handleSocketClosed)
    },
  ]
  entry.rcon.once('end', handleSocketClosed)
}

function cleanupConnection(
  key: string,
  entry: CachedRconEntry,
  options?: { skipClosing?: boolean; reason?: string },
) {
  const cachedEntry = rconCache.get(key)
  if (cachedEntry !== entry) {
    return
  }

  if (entry.idleTimer) {
    clearTimeout(entry.idleTimer)
  }

  entry.lifecycleCleanups.forEach(cleanup => {
    cleanup()
  })
  entry.lifecycleCleanups = []

  rconCache.delete(key)
  logger.trace({ cacheKey: key, reason: options?.reason }, `cleaning up cached RCON connection`)

  if (!options?.skipClosing) {
    void entry.rcon.end().catch((error: unknown) => {
      assertIsError(error)
      logger.warn(error, `cache key ${key}: failed closing RCON connection`)
    })
  }
}

function buildCacheKey(address: string, port: string, password: string) {
  return `${address}:${port}:${password}`
}

export function __resetRconConnectionCacheForTestsOnly() {
  for (const entry of rconCache.values()) {
    if (entry.idleTimer) {
      clearTimeout(entry.idleTimer)
    }
    entry.lifecycleCleanups.forEach(cleanup => {
      cleanup()
    })
    entry.lifecycleCleanups = []
    void entry.rcon.end().catch((error: unknown) => {
      assertIsError(error)
      logger.debug(error, 'test-only cache reset: failed closing RCON connection')
    })
  }
  rconCache.clear()
  pendingConnections.clear()
}
