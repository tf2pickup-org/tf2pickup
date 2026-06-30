import type { GameModel, GameNumber } from '../database/models/game.model'

export interface RenumberResult {
  games: GameModel[]
  // `${legacy.gamemode}:${legacy.number}` → new global game number. Keyed by
  // gamemode because each merged instance numbered its games from 1, so the old
  // number alone is ambiguous across instances.
  remap: Map<string, GameNumber>
}

export function legacyKey(gamemode: string, number: number): string {
  return `${gamemode}:${number}`
}

/**
 * Re-sequence games from several merged instances into one global numbering,
 * ordered by launch date. Each game keeps a `legacy` mapping to its original
 * gamemode + number (powering the `?old_gamemode=` redirect), and a remap table
 * is returned so references to old numbers can be rewritten.
 *
 * Pure and idempotent: a game that already carries `legacy` keeps it, so
 * re-running over already-merged data preserves the original mapping.
 */
export function renumberGames(games: GameModel[]): RenumberResult {
  const sorted = [...games].sort((a, b) => a.events[0].at.getTime() - b.events[0].at.getTime())

  const remap = new Map<string, GameNumber>()
  const renumbered = sorted.map((game, index) => {
    const number = (index + 1) as GameNumber
    const legacy = game.legacy ?? { gamemode: game.gamemode, number: game.number }
    remap.set(legacyKey(legacy.gamemode, legacy.number), number)
    return { ...game, number, legacy }
  })

  return { games: renumbered, remap }
}
