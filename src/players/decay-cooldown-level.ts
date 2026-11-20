import type { PlayerModel } from '../database/models/player.model'

// Cooldown levels come back down over time: one level per `decayPeriodMs` since the level last
// changed. The stored level is left alone and the decay is evaluated on demand, so no job has to
// sweep every player. The level is only written back when it actually changes (a new cooldown or
// an admin setting it), which is also what restarts the clock.
export function decayCooldownLevel(
  player: Pick<PlayerModel, 'cooldownLevel' | 'cooldownLevelUpdatedAt'>,
  now: Date,
  decayPeriodMs: number,
): { level: number; decayedLevels: number; nextDecayAt: Date | null } {
  const storedLevel = Math.max(0, player.cooldownLevel)

  if (storedLevel === 0 || decayPeriodMs <= 0 || !player.cooldownLevelUpdatedAt) {
    return { level: storedLevel, decayedLevels: 0, nextDecayAt: null }
  }

  const elapsedMs = Math.max(0, now.getTime() - player.cooldownLevelUpdatedAt.getTime())
  const decayedLevels = Math.floor(elapsedMs / decayPeriodMs)
  const level = Math.max(0, storedLevel - decayedLevels)

  return {
    level,
    decayedLevels,
    nextDecayAt:
      level > 0
        ? new Date(player.cooldownLevelUpdatedAt.getTime() + (decayedLevels + 1) * decayPeriodMs)
        : null,
  }
}
