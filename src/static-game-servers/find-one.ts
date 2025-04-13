import { collections } from '../database/collections'
import type { StaticGameServerModel } from '../database/models/static-game-server.model'
import { errors } from '../errors'

export async function findOne(id: string): Promise<StaticGameServerModel> {
  const server = await collections.staticGameServers.findOne({
    id,
    isOnline: true,
    game: { $exists: false },
  })
  if (server === null) {
    throw errors.notFound(`game server not found: ${id}`)
  }
  return server
}
