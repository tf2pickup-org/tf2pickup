import { collections } from '../database/collections'
import type { StaticGameServerModel } from '../database/models/static-game-server.model'
import { errors } from '../errors'

export async function findFree(): Promise<StaticGameServerModel> {
  const server = await collections.staticGameServers.findOne(
    {
      isOnline: true,
      game: { $exists: false },
    },
    { sort: { priority: -1 } },
  )
  if (server === null) {
    throw errors.internalServerError('no free servers available')
  }
  return server
}
