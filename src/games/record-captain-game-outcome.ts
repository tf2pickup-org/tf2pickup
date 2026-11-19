import { collections } from '../database/collections'
import type { GameModel } from '../database/models/game.model'
import { players } from '../players'
import { calculateCaptainEloUpdates } from './calculate-captain-elo-updates'

export async function recordCaptainGameOutcome(game: GameModel): Promise<void> {
  const snapshots = await collections.players
    .find(
      {
        steamId: {
          $in: [
            ...new Set([
              ...game.slots.map(slot => slot.player),
              ...Object.values(game.captains ?? {}),
            ]),
          ],
        },
      },
      { projection: { steamId: 1, captainModeElo: 1, eloHistory: 1 } },
    )
    .toArray()
  const updates = calculateCaptainEloUpdates(
    game,
    new Map(snapshots.map(player => [player.steamId, player])),
  )
  await Promise.all(
    updates.map(async ({ steamId, history }) => {
      await players.update(steamId, before => {
        const previous = before.captainModeElo?.[game.gamemode]
        return {
          $set: {
            [`captainModeElo.${game.gamemode}`]: {
              ...previous,
              classes: { ...previous?.classes, ...history.elo },
              ...(history.overall !== undefined && { overall: history.overall }),
              ...(history.captain !== undefined && { captain: history.captain }),
            },
          },
          $push: { eloHistory: history },
        }
      })
    }),
  )
}
