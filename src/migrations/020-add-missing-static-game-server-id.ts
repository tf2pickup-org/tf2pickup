import { nanoid } from 'nanoid'
import { collections } from '../database/collections'
import { logger } from '../logger'

export async function up() {
  const toUpdate = await collections.staticGameServers.find({ id: { $exists: false } }).toArray()

  for (const server of toUpdate) {
    await collections.staticGameServers.updateOne({ _id: server._id }, { $set: { id: nanoid() } })
  }

  logger.info(`added missing IDs to ${toUpdate.length} static game servers`)
}
