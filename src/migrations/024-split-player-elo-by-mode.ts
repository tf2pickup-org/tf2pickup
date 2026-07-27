import { collections } from '../database/collections'
import { logger } from '../logger'
import { QueueMode } from '../shared/types/queue-mode'

/**
 * ELO used to be a single per-class record. Captain mode gets its own ladder, so the existing
 * values move under `elo.auto` and every history entry is stamped with the mode it came from.
 */
export async function up() {
  const { modifiedCount: eloUpdated } = await collections.players.updateMany(
    { elo: { $exists: true }, [`elo.${QueueMode.auto}`]: { $exists: false } },
    // An object literal here would merge into the existing `elo` document and leave the old
    // per-class keys behind alongside the new one; $arrayToObject replaces it wholesale.
    [{ $set: { elo: { $arrayToObject: [[{ k: QueueMode.auto, v: '$elo' }]] } } }],
  )

  const { modifiedCount: historyUpdated } = await collections.players.updateMany(
    { 'eloHistory.0': { $exists: true } },
    [
      {
        $set: {
          eloHistory: {
            $map: {
              input: '$eloHistory',
              as: 'entry',
              in: { $mergeObjects: [{ mode: QueueMode.auto }, '$$entry'] },
            },
          },
        },
      },
    ],
  )

  logger.info(
    `moved ELO under "${QueueMode.auto}" for ${eloUpdated} players, stamped the mode on the ELO history of ${historyUpdated} players`,
  )
}
