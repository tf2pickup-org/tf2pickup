import { configuration } from '../configuration'
import { collections } from '../database/collections'

export async function applyMapCooldown(map: string) {
  await collections.maps.updateMany(
    { name: { $ne: map }, cooldown: { $gt: 0 } },
    { $inc: { cooldown: -1 } },
  )
  const cooldown = await configuration.get('queue.map_cooldown')
  await collections.maps.updateOne({ name: map }, { $set: { cooldown } })
}
