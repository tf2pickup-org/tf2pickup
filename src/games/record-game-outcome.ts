import type { Tf2ClassName } from '../shared/types/tf2-class-name'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { type PlayerElo } from '../database/models/player.model'
import { GameState, type GameModel } from '../database/models/game.model'
import { collections } from '../database/collections'
import { players } from '../players'
import { calculateEloUpdates, defaultElo } from './calculate-elo-updates'

// Records the outcome of a finished game: ELO adjustments and per-class game
// counts. The order matters — ELO's K-factor depends on how many games a player
// had *before* this one, so ELO must be read and computed before stats are
// incremented. Keeping both in one owner is what guarantees that ordering.
export async function recordGameOutcome(game: GameModel): Promise<void> {
  if (game.state !== GameState.ended) {
    return
  }

  const eloMap = new Map<SteamId64, Partial<Record<Tf2ClassName, number>>>()
  const gamesByClassMap = new Map<SteamId64, Partial<Record<Tf2ClassName, number>>>()

  await Promise.all(
    game.slots.map(async slot => {
      const player = await collections.players.findOne(
        { steamId: slot.player },
        { projection: { elo: 1, 'stats.gamesByClass': 1 } },
      )
      eloMap.set(slot.player, player?.elo?.[game.gamemode] ?? {})
      gamesByClassMap.set(slot.player, player?.stats.gamesByClass[game.gamemode] ?? {})
    }),
  )

  const updates = calculateEloUpdates(
    game,
    (steamId, gameClass) => eloMap.get(steamId)?.[gameClass] ?? defaultElo,
    (steamId, gameClass) => gamesByClassMap.get(steamId)?.[gameClass] ?? 0,
  )

  await Promise.all(
    updates.map(async ({ steamId, gameClass, newElo, at, game: gameNumber }) => {
      const eloUpdate: PlayerElo = { [gameClass]: newElo }
      await players.update(steamId, before => ({
        $set: { [`elo.${game.gamemode}`]: { ...before.elo?.[game.gamemode], ...eloUpdate } },
        $push: {
          eloHistory: { at, gamemode: game.gamemode, elo: eloUpdate, game: gameNumber },
        },
      }))
    }),
  )

  await Promise.all(
    game.slots.map(async slot => {
      await players.update(slot.player, {
        $inc: {
          'stats.totalGames': 1,
          [`stats.gamesByGamemode.${game.gamemode}`]: 1,
          [`stats.gamesByClass.${game.gamemode}.${slot.gameClass}`]: 1,
        },
      })
    }),
  )
}
