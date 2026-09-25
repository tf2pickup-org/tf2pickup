import type { GameNumber } from '../database/models/game.model'
import type { ClassCount, PlayerModel, PlayerStats } from '../database/models/player.model'

function byAt<T extends { at: Date }>(a: T, b: T) {
  return a.at.getTime() - b.at.getTime()
}

function sumGamesByClass(
  a: PlayerStats['gamesByClass'],
  b: PlayerStats['gamesByClass'],
): PlayerStats['gamesByClass'] {
  const sum: PlayerStats['gamesByClass'] = { ...a }
  for (const [gamemode, counts] of Object.entries(b) as [keyof typeof b, ClassCount][]) {
    const merged: ClassCount = { ...sum[gamemode] }
    for (const [gameClass, count] of Object.entries(counts) as [keyof ClassCount, number][]) {
      merged[gameClass] = (merged[gameClass] ?? 0) + count
    }
    sum[gamemode] = merged
  }
  return sum
}

// Game numbers in the incoming player's history point at the incoming instance's games.
function renumberHistory(player: PlayerModel, numberMap: Map<number, GameNumber>): PlayerModel {
  const renumber = (number: GameNumber) => numberMap.get(number) ?? number
  return {
    ...player,
    ...(player.skillHistory && {
      skillHistory: player.skillHistory.map(entry =>
        entry.lastGame === undefined ? entry : { ...entry, lastGame: renumber(entry.lastGame) },
      ),
    }),
    ...(player.eloHistory && {
      eloHistory: player.eloHistory.map(entry => ({ ...entry, game: renumber(entry.game) })),
    }),
  }
}

// Identity, profile and roles stay the primary's: a merge never grants authority someone only
// had on the other instance. Game counts add up; per-gamemode skill and elo are the primary's
// where both instances have them; bans and history from both are kept.
function mergePlayer(primary: PlayerModel, incoming: PlayerModel): PlayerModel {
  return {
    ...primary,
    joinedAt: primary.joinedAt < incoming.joinedAt ? primary.joinedAt : incoming.joinedAt,
    cooldownLevel: Math.max(primary.cooldownLevel, incoming.cooldownLevel),
    hasAcceptedRules: primary.hasAcceptedRules || incoming.hasAcceptedRules,
    ...((primary.verified === true || incoming.verified === true) && { verified: true }),
    ...((primary.skill ?? incoming.skill) && { skill: { ...incoming.skill, ...primary.skill } }),
    ...((primary.elo ?? incoming.elo) && { elo: { ...incoming.elo, ...primary.elo } }),
    skillHistory: [...(primary.skillHistory ?? []), ...(incoming.skillHistory ?? [])].sort(byAt),
    eloHistory: [...(primary.eloHistory ?? []), ...(incoming.eloHistory ?? [])].sort(byAt),
    bans: [...(primary.bans ?? []), ...(incoming.bans ?? [])],
    chatMutes: [...(primary.chatMutes ?? []), ...(incoming.chatMutes ?? [])],
    stats: {
      totalGames: primary.stats.totalGames + incoming.stats.totalGames,
      gamesByClass: sumGamesByClass(primary.stats.gamesByClass, incoming.stats.gamesByClass),
    },
  }
}

// The players to write to the primary: those on both instances, merged, and those only on the
// incoming one, without their roles.
export function mergePlayers(
  primary: PlayerModel[],
  incoming: PlayerModel[],
  numberMap: Map<number, GameNumber>,
): PlayerModel[] {
  const byId = new Map(primary.map(player => [player.steamId, player]))
  return incoming.map(player => {
    const renumbered = renumberHistory(player, numberMap)
    const existing = byId.get(player.steamId)
    return existing ? mergePlayer(existing, renumbered) : { ...renumbered, roles: [] }
  })
}
