import { subMonths } from 'date-fns'
import { collections } from '../database/collections'
import { logger } from '../logger'
import { GameState } from '../database/models/game.model'
import { GameEventType } from '../database/models/game-event.model'
import type { PlayerElo } from '../database/models/player.model'
import type { SteamId64 } from '../shared/types/steam-id-64'
import type { Tf2ClassName } from '../shared/types/tf2-class-name'
import type { GameNumber } from '../database/models/game.model'
import { calculateEloUpdates, defaultElo as defaultEloValue } from '../games/calculate-elo-updates'

export async function up() {
  const since = subMonths(new Date(), 6)

  const games = await collections.games
    .find(
      { state: GameState.ended, 'events.0.at': { $gte: since } },
      { sort: { 'events.0.at': 1 } },
    )
    .toArray()

  logger.info(`backfilling ELO from ${games.length} games since ${since.toISOString()}`)

  // In-memory state: updated as each game is processed in order
  const eloState = new Map<SteamId64, Partial<Record<Tf2ClassName, number>>>()
  const gamesPlayedState = new Map<SteamId64, Partial<Record<Tf2ClassName, number>>>()
  const eloHistoryState = new Map<
    SteamId64,
    { at: Date; elo: PlayerElo; game: GameNumber }[]
  >()

  for (const game of games) {
    const updates = calculateEloUpdates(
      game,
      (steamId, gameClass) => eloState.get(steamId)?.[gameClass] ?? defaultEloValue,
      (steamId, gameClass) => gamesPlayedState.get(steamId)?.[gameClass] ?? 0,
    )

    for (const { steamId, gameClass, newElo, at } of updates) {
      // Update ELO state
      const currentElo = eloState.get(steamId) ?? {}
      eloState.set(steamId, { ...currentElo, [gameClass]: newElo })

      // Append to history
      const history = eloHistoryState.get(steamId) ?? []
      history.push({ at, elo: { [gameClass]: newElo }, game: game.number })
      eloHistoryState.set(steamId, history)
    }

    // Increment games-played count for all eligible slots (drives K-factor in subsequent games)
    const eligibleSteamIds = new Set(updates.map(u => u.steamId))
    for (const slot of game.slots) {
      if (!eligibleSteamIds.has(slot.player)) continue
      const current = gamesPlayedState.get(slot.player) ?? {}
      gamesPlayedState.set(slot.player, {
        ...current,
        [slot.gameClass]: (current[slot.gameClass] ?? 0) + 1,
      })
    }
  }

  // Write results to the database
  let updated = 0
  for (const [steamId, elo] of eloState) {
    await collections.players.updateOne(
      { steamId },
      { $set: { elo }, $push: { eloHistory: { $each: eloHistoryState.get(steamId) ?? [] } } },
    )
    updated++
  }

  logger.info(
    `backfilled ELO for ${updated} players from ${games.length} games (event: ${GameEventType.gameEnded})`,
  )
}
