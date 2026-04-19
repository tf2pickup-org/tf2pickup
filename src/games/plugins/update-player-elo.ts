import fp from 'fastify-plugin'
import { events } from '../../events'
import type { Tf2ClassName } from '../../shared/types/tf2-class-name'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { type PlayerElo } from '../../database/models/player.model'
import { collections } from '../../database/collections'
import { players } from '../../players'
import { safe } from '../../utils/safe'
import { calculateEloUpdates, defaultElo as defaultEloValue } from '../calculate-elo-updates'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on(
      'game:ended',
      safe(async ({ game }) => {
        const eloMap = new Map<SteamId64, Partial<Record<Tf2ClassName, number>>>()
        const gamesByClassMap = new Map<SteamId64, Partial<Record<Tf2ClassName, number>>>()

        await Promise.all(
          game.slots.map(async slot => {
            const player = await collections.players.findOne(
              { steamId: slot.player },
              { projection: { elo: 1, 'stats.gamesByClass': 1 } },
            )
            eloMap.set(slot.player, player?.elo ?? {})
            gamesByClassMap.set(slot.player, player?.stats.gamesByClass ?? {})
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
              $set: { elo: { ...before.elo, ...eloUpdate } },
              $push: {
                eloHistory: { at, elo: eloUpdate, game: gameNumber },
              },
            }))
          }),
        )
      }),
    )
  },
)
