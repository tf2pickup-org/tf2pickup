import { configuration } from '../configuration'
import { collections } from '../database/collections'
import { logger } from '../logger'

export async function applyMapCooldown(map: string) {
  logger.trace({ map }, 'queue.applyMapCooldown()')
  await collections.maps.updateMany(
    { name: { $ne: map }, cooldown: { $gt: 0 } },
    { $inc: { cooldown: -1 } },
  )
  const cooldown = await configuration.get('queue.map_cooldown')
  await collections.maps.updateOne({ name: map }, { $set: { cooldown } })
}
