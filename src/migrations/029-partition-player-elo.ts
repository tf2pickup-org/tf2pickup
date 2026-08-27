import { collections } from '../database/collections'
import { environment } from '../environment'
import { Gamemode } from '../shared/types/gamemode'

// Elo used to be a single class→elo map, because an instance ran exactly one gamemode.
export async function up() {
  const gamemode = environment.QUEUE_CONFIG

  await collections.players.updateMany(
    {
      elo: { $type: 'object' },
      $nor: Object.values(Gamemode).map(g => ({ [`elo.${g}`]: { $exists: true } })),
    },
    [{ $set: { elo: { [gamemode]: '$elo' } } }],
  )
  await collections.players.updateMany({ 'eloHistory.0': { $exists: true } }, [
    {
      $set: {
        eloHistory: {
          $map: { input: '$eloHistory', in: { $mergeObjects: [{ gamemode }, '$$this'] } },
        },
      },
    },
  ])
}
