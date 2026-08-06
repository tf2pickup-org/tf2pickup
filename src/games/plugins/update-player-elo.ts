import fp from 'fastify-plugin'
import { events } from '../../events'
import type { Tf2ClassName } from '../../shared/types/tf2-class-name'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { type PlayerElo, type PlayerModel } from '../../database/models/player.model'
import { collections } from '../../database/collections'
import { players } from '../../players'
import { safe } from '../../utils/safe'
import { QueueMode } from '../../shared/types/queue-mode'
import { calculateEloUpdates, defaultElo as defaultEloValue } from '../calculate-elo-updates'

/**
 * How many games in this mode have already moved a player's rating, per class.
 *
 * This drives the K-factor, so it has to be per mode: `stats.gamesByClass` counts both ladders,
 * and a veteran of the auto queue would otherwise start their captain rating already out of its
 * provisional period, barely moving from 1500 for months. The ELO history is per mode and one
 * entry is exactly one rated game, so it is the count we want without a new field to maintain.
 */
function gamesRatedIn(
  mode: QueueMode,
  history: PlayerModel['eloHistory'],
): Partial<Record<Tf2ClassName, number>> {
  const counts: Partial<Record<Tf2ClassName, number>> = {}
  for (const entry of history ?? []) {
    if (entry.mode !== mode) {
      continue
    }

    for (const gameClass of Object.keys(entry.elo) as Tf2ClassName[]) {
      counts[gameClass] = (counts[gameClass] ?? 0) + 1
    }
  }

  return counts
}

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on(
      'game:ended',
      safe(async ({ game }) => {
        // captain games carry a draft; everything else came out of the auto queue
        const mode = game.draft ? QueueMode.captains : QueueMode.auto
        const eloMap = new Map<SteamId64, Partial<Record<Tf2ClassName, number>>>()
        const gamesByClassMap = new Map<SteamId64, Partial<Record<Tf2ClassName, number>>>()

        await Promise.all(
          game.slots.map(async slot => {
            const player = await collections.players.findOne(
              { steamId: slot.player },
              { projection: { elo: 1, eloHistory: 1 } },
            )
            eloMap.set(slot.player, player?.elo?.[mode] ?? {})
            gamesByClassMap.set(slot.player, gamesRatedIn(mode, player?.eloHistory))
          }),
        )

        const updates = calculateEloUpdates(
          game,
          (steamId, gameClass) => eloMap.get(steamId)?.[gameClass] ?? defaultEloValue,
          (steamId, gameClass) => gamesByClassMap.get(steamId)?.[gameClass] ?? 0,
        )

        await Promise.all(
          updates.map(async ({ steamId, gameClass, newElo, at, game: gameNumber }) => {
            const eloUpdate: PlayerElo = { [gameClass]: newElo }
            await players.update(steamId, before => ({
              $set: { elo: { ...before.elo, [mode]: { ...before.elo?.[mode], ...eloUpdate } } },
              $push: {
                eloHistory: { at, mode, elo: eloUpdate, game: gameNumber },
              },
            }))
          }),
        )
      }),
    )
  },
)
