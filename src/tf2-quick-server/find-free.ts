import { collections } from '../database/collections'
import { GameState } from '../database/models/game.model'
import { type Tf2QuickServer, listServers } from './client'

export async function findFree(): Promise<Tf2QuickServer | null> {
  const servers = await listServers()
  const readyServers = servers.filter(s => s.status === 'ready')

  if (readyServers.length === 0) {
    return null
  }

  const readyIds = readyServers.map(s => s.serverId)
  const activeGames = await collections.games
    .find({
      state: {
        $in: [GameState.created, GameState.configuring, GameState.launching, GameState.started],
      },
      'gameServer.id': { $in: readyIds },
    })
    .toArray()

  const usedIds = new Set(activeGames.map(g => g.gameServer!.id))
  return readyServers.find(s => !usedIds.has(s.serverId)) ?? null
}
