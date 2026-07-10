import type { PlayerModel } from '../database/models/player.model'

function mergeByGamemode<T>(primary: T | undefined, secondary: T | undefined): T | undefined {
  if (!primary && !secondary) {
    return undefined
  }
  // Gamemode keys are disjoint across merged instances; on the unlikely overlap
  // the primary instance wins.
  return { ...secondary, ...primary } as T
}

function byAt<T extends { at: Date }>(a: T, b: T): number {
  return a.at.getTime() - b.at.getTime()
}

/**
 * Merge one player that exists on both instances. Profile fields follow
 * "primary instance wins"; the per-gamemode skill/elo/stats are unioned (their
 * gamemode keys are disjoint); roles are unioned so an admin on the secondary
 * instance keeps their authority. Bans are unioned too, so a ban on either
 * instance survives the merge.
 */
export function mergePlayer(primary: PlayerModel, secondary: PlayerModel): PlayerModel {
  const skill = mergeByGamemode(primary.skill, secondary.skill)
  const elo = mergeByGamemode(primary.elo, secondary.elo)
  return {
    ...primary,
    roles: [...new Set([...primary.roles, ...secondary.roles])],
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
 * Merge the secondary instance's players into the primary's by steamId. Players
 * present on only one instance are carried over unchanged.
 */
export function mergePlayers(primary: PlayerModel[], secondary: PlayerModel[]): PlayerModel[] {
  const merged = new Map(primary.map(player => [player.steamId, player]))
  for (const player of secondary) {
    const existing = merged.get(player.steamId)
    merged.set(player.steamId, existing ? mergePlayer(existing, player) : player)
  }
  return [...merged.values()]
}
