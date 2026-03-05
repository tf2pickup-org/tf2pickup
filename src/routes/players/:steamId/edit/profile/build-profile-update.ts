import type { StrictUpdateFilter } from 'mongodb'
import type { PlayerModel } from '../../../../../database/models/player.model'

export function buildProfileUpdate(
  beforeName: string,
  { name, cooldownLevel }: { name: string; cooldownLevel: number },
): StrictUpdateFilter<PlayerModel> {
  const playerUpdate: StrictUpdateFilter<PlayerModel> = { $set: { name, cooldownLevel } }
  if (beforeName !== name) {
    playerUpdate.$push = { nameHistory: { name: beforeName, changedAt: new Date() } }
  }
  return playerUpdate
}
