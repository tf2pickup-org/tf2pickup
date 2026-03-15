import { GameServerProvider, type GameNumber, type GameServer } from '../database/models/game.model'
import { configuration } from '../configuration'
import { environment } from '../environment'
import { errors } from '../errors'
import { logger } from '../logger'
import { createServer, listServers } from './client'
import { findFree } from './find-free'
import { toGameServer } from './to-game-server'
import { games } from '../games'
import { GameEventType } from '../database/models/game-event.model'
import type { SteamId64 } from '../shared/types/steam-id-64'

type AssignOptions =
  | {
      serverId: string
    }
  | {
      region: string
    }

export async function assign(gameNumber: GameNumber, options?: AssignOptions, actor?: SteamId64) {
  if (!environment.TF2_QUICK_SERVER_CLIENT_ID || !environment.TF2_QUICK_SERVER_CLIENT_SECRET) {
    throw errors.badRequest('TF2 QuickServer is disabled')
  }

  const gameServer = await selectServer(options)
  await games.update(gameNumber, {
    $set: {
      gameServer,
    },
    $push: {
      events: {
        event: GameEventType.gameServerAssigned,
        at: new Date(),
        gameServerName: gameServer.name,
        ...(actor && { actor }),
      },
    },
  })
}

function stubGameServer(taskId: string): GameServer {
  return {
    provider: GameServerProvider.tf2QuickServer,
    id: taskId,
    name: 'A new quick server',
    address: '',
    port: '0',
    pendingTaskId: taskId,
    rcon: {
      address: '',
      port: '0',
      password: '',
    },
  }
}

async function selectServer(options?: AssignOptions) {
  if (options && 'serverId' in options) {
    // Admin selected a specific existing server by ID
    const servers = await listServers()
    const server = servers.find(s => s.serverId === options.serverId)
    if (!server) {
      throw errors.badRequest(`TF2 QuickServer ${options.serverId} not found`)
    }
    if (server.status !== 'ready') {
      throw errors.badRequest(
        `Cannot use server ${options.serverId}: the server is ${server.status}`,
      )
    }
    logger.info({ serverId: options.serverId }, 'using admin-selected TF2 QuickServer')
    return toGameServer(server)
  }

  let region = options?.region
  if (!region) {
    // Auto-assign: try to reuse a free server first
    const free = await findFree()
    if (free) {
      logger.info({ serverId: free.serverId }, 'reusing existing TF2 QuickServer')
      return toGameServer(free)
    }
    region = await configuration.get('tf2_quick_server.region')
  }

  const { taskId } = await createServer(region)
  logger.info({ taskId, region }, 'TF2 QuickServer creation started')
  return stubGameServer(taskId)
}
