import { collections } from '../database/collections'
import { logger } from '../logger'
import { GameState } from '../database/models/game.model'
import { SlotStatus } from '../database/models/game-slot.model'
import type { PlayerStats } from '../database/models/player.model'
import type { Tf2ClassName } from '../shared/types/tf2-class-name'

export async function up() {
  const cursor = collections.players.find({})
  let nUpdated = 0

  while (await cursor.hasNext()) {
    const player = await cursor.next()
    if (!player) {
      continue
    }

    // Calculate stats from existing games
    const games = await collections.games
      .find({
        state: GameState.ended,
        'slots.player': player.steamId,
      })
      .toArray()

    const stats = {
      totalGames: 0,
      gamesByClass: {} as Partial<Record<Tf2ClassName, number>>,
    }

    for (const game of games) {
      const slot = game.slots.find(
        s => s.player === player.steamId && s.status === SlotStatus.active,
      )
      if (slot) {
        stats.totalGames += 1
        stats.gamesByClass[slot.gameClass] = (stats.gamesByClass[slot.gameClass] ?? 0) + 1
      }
    }

    // Predates the gamemode dimension: writes the flat shape that migration 024
    // later re-nests under the instance's gamemode.
    await collections.players.updateOne(
      { steamId: player.steamId },
      {
        $set: {
          stats: stats as unknown as PlayerStats,
        },
      },
    )

    nUpdated += 1
  }

  logger.info(`initialized stats for ${nUpdated} players`)
}
