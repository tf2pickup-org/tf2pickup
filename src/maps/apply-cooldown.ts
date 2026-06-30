import { configuration } from '../configuration'
import { collections } from '../database/collections'
import { logger } from '../logger'
import type { Gamemode } from '../shared/types/gamemode'

export async function applyMapCooldown(gamemode: Gamemode, map: string) {
  logger.trace({ gamemode, map }, 'queue.applyMapCooldown()')
  await collections.maps.updateMany(
    { gamemode, name: { $ne: map }, cooldown: { $gt: 0 } },
    { $inc: { cooldown: -1 } },
  )
  const cooldown = await configuration.get('queue.map_cooldown', gamemode)
  await collections.maps.updateOne({ gamemode, name: map }, { $set: { cooldown } })
}
