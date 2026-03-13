import { GameServerProvider, type GameServer } from '../database/models/game.model'
import type { Tf2QuickServer } from './client'

export function toGameServer(server: Tf2QuickServer): GameServer {
  return {
    provider: GameServerProvider.tf2QuickServer,
    id: server.serverId,
    name: `tf2quickserver-${server.serverId.substring(0, 8)}`,
    address: server.hostIp,
    port: server.hostPort.toString(),
    stvAddress: server.tvIp,
    stvPort: server.tvPort,
    rcon: {
      address: server.rconAddress,
      port: '27015',
      password: server.rconPassword,
    },
  }
}
