import { collections } from '../database/collections'
import type { StaticGameServerModel } from '../database/models/static-game-server.model'

export function findFree(): Promise<StaticGameServerModel | null> {
  return collections.staticGameServers.findOne({
    isOnline: true,
    game: { $exists: false },
  })
}
