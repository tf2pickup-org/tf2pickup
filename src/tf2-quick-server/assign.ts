import { GameServerProvider, type GameServer } from '../database/models/game.model'
import { configuration } from '../configuration'
import { environment } from '../environment'
import { errors } from '../errors'
import { logger } from '../logger'
import { createServer, listServers } from './client'
import { findFree } from './find-free'
import { toGameServer } from './to-game-server'

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

export async function assign({
  serverId,
  region,
  map,
}: { serverId?: string; region?: string; map?: string } = {}): Promise<GameServer> {
  if (!environment.TF2_QUICK_SERVER_CLIENT_ID || !environment.TF2_QUICK_SERVER_CLIENT_SECRET) {
    throw errors.badRequest('TF2 QuickServer is disabled')
  }

  if (serverId) {
    // Admin selected a specific existing server by ID
    const servers = await listServers()
    const server = servers.find(s => s.serverId === serverId)
    if (!server) {
      throw errors.badRequest(`TF2 QuickServer ${serverId} not found`)
    }
    if (server.status !== 'ready') {
      throw errors.badRequest(`Cannot use server ${serverId}: the server is ${server.status}`)
    }
    logger.info({ serverId }, 'using admin-selected TF2 QuickServer')
    return toGameServer(server)
  }

  if (!region) {
    // Auto-assign: try to reuse a free server first
    const free = await findFree()
    if (free) {
      logger.info({ serverId: free.serverId }, 'reusing existing TF2 QuickServer')
      return toGameServer(free)
    }
    region = await configuration.get('tf2_quick_server.region')
  }

  const { taskId } = await createServer(region, map)
  logger.info({ taskId, region }, 'TF2 QuickServer creation started')
  return stubGameServer(taskId)
}
