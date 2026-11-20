import type { StrictUpdateFilter } from 'mongodb'
import type { PlayerModel } from '../../../../../database/models/player.model'
import { decayCooldownLevel } from '../../../../../players/decay-cooldown-level'

export function buildProfileUpdate(
  before: PlayerModel,
  {
    name,
    cooldownLevel,
    cooldownLevelAsShown,
  }: { name: string; cooldownLevel: number; cooldownLevelAsShown?: number | undefined },
  decayPeriodMs: number,
): StrictUpdateFilter<PlayerModel> {
  const now = new Date()

  // The form renders the decayed level, so a submission that repeats what it showed is not an
  // edit and must not restart the decay clock. Comparing with the rendered value instead of the
  // current one covers the level decaying between rendering the form and saving it.
  const { level } = decayCooldownLevel(before, now, decayPeriodMs)
  const edited = cooldownLevel !== (cooldownLevelAsShown ?? level)

  const playerUpdate: StrictUpdateFilter<PlayerModel> = {
    $set: edited ? { name, cooldownLevel, cooldownLevelUpdatedAt: now } : { name },
  }

  if (before.name !== name) {
    playerUpdate.$push = { nameHistory: { name: before.name, changedAt: now } }
  }
  return playerUpdate
}
