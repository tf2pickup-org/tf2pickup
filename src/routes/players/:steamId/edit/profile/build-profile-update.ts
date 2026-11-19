import type { StrictUpdateFilter } from 'mongodb'
import type { PlayerModel } from '../../../../../database/models/player.model'
import { decayCooldownLevel } from '../../../../../players/decay-cooldown-level'

export function buildProfileUpdate(
  before: PlayerModel,
  { name, cooldownLevel }: { name: string; cooldownLevel: number },
  decayPeriodMs: number,
): StrictUpdateFilter<PlayerModel> {
  const now = new Date()

  // Only touch the cooldown when the submitted level differs from the effective one, so that
  // saving an unrelated field does not restart the decay clock.
  const { level } = decayCooldownLevel(before, now, decayPeriodMs)

  const playerUpdate: StrictUpdateFilter<PlayerModel> = {
    $set: cooldownLevel === level ? { name } : { name, cooldownLevel, cooldownLevelUpdatedAt: now },
  }

  if (before.name !== name) {
    playerUpdate.$push = { nameHistory: { name: before.name, changedAt: now } }
  }
  return playerUpdate
}
