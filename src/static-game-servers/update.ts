import type { StrictFilter, StrictUpdateFilter } from 'mongodb'
import type { StaticGameServerModel } from '../database/models/static-game-server.model'
import { Mutex } from 'async-mutex'
import { collections } from '../database/collections'
import { events } from '../events'
import { errors } from '../errors'

const mutex = new Mutex()

export async function update(
  filter: StrictFilter<StaticGameServerModel>,
  update: StrictUpdateFilter<StaticGameServerModel>,
): Promise<StaticGameServerModel> {
  return await mutex.runExclusive(async () => {
    const before = await collections.staticGameServers.findOne(filter)
    if (!before) {
      throw errors.notFound(`static game server (${JSON.stringify(filter)}) not found`)
    }

    const after = await collections.staticGameServers.findOneAndUpdate(filter, update, {
      returnDocument: 'after',
    })
    if (!after) {
      throw errors.internalServerError(`can't update static game server ${JSON.stringify(filter)}`)
    }

    events.emit('staticGameServer:updated', { before, after })
    return after
  })
}
