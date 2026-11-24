import type { PlayerBan } from '../../database/models/player.model'

// ponytail: `start` is deliberately ignored; a future-dated ban counts from the moment it's added
export function isActive(restriction: PlayerBan, now = new Date()): boolean {
  return restriction.end > now
}
