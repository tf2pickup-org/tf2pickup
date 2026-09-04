import type { PlayerModel } from '../database/models/player.model'

function earliest(a: Date, b: Date): Date {
  return a.getTime() <= b.getTime() ? a : b
}

function byAt<T extends { at: Date }>(a: T, b: T): number {
  return a.at.getTime() - b.at.getTime()
}

// Per-gamemode maps (skill/elo/stats) have disjoint keys across two instances
// that ran different gamemodes; on the unlikely overlap the primary wins.
function mergeByGamemode<T>(primary: T | undefined, secondary: T | undefined): T | undefined {
  if (!primary && !secondary) {
    return undefined
  }
  return { ...secondary, ...primary } as T
}

/**
 * Merge a player that exists on both instances. Identity is "primary wins", so
 * profile fields and — deliberately — `roles` stay the primary's: a merge never
 * grants anyone authority they only held on the secondary. Registration takes
 * the earliest of the two `joinedAt`; bans are unioned so a ban on either
 * instance survives; per-gamemode skill/elo/stats are unioned.
 */
export function mergePlayer(primary: PlayerModel, secondary: PlayerModel): PlayerModel {
  const skill = mergeByGamemode(primary.skill, secondary.skill)
  const elo = mergeByGamemode(primary.elo, secondary.elo)
  return {
    ...primary,
    joinedAt: earliest(primary.joinedAt, secondary.joinedAt),
    ...(skill !== undefined ? { skill } : {}),
    ...(elo !== undefined ? { elo } : {}),
    skillHistory: [...(primary.skillHistory ?? []), ...(secondary.skillHistory ?? [])].sort(byAt),
    eloHistory: [...(primary.eloHistory ?? []), ...(secondary.eloHistory ?? [])].sort(byAt),
    bans: [...(primary.bans ?? []), ...(secondary.bans ?? [])],
    stats: {
      totalGames: primary.stats.totalGames + secondary.stats.totalGames,
      gamesByGamemode: {
        ...secondary.stats.gamesByGamemode,
        ...primary.stats.gamesByGamemode,
      },
      gamesByClass: {
        ...secondary.stats.gamesByClass,
        ...primary.stats.gamesByClass,
      },
    },
  }
}

/**
 * Merge the secondary instance's players into the primary's by steamId. A
 * player only on the secondary is imported, but stripped of roles for the same
 * "no imported authority" reason.
 */
export function mergePlayers(primary: PlayerModel[], secondary: PlayerModel[]): PlayerModel[] {
  const merged = new Map(primary.map(player => [player.steamId, player]))
  for (const player of secondary) {
    const existing = merged.get(player.steamId)
    merged.set(player.steamId, existing ? mergePlayer(existing, player) : { ...player, roles: [] })
  }
  return [...merged.values()]
}
