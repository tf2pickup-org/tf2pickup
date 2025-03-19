import { collections } from '../database/collections'
import { logger } from '../logger'

export async function up() {
  // Add missing slot.status fields for very old games (launched before 01.10.2019)
  const games = await collections.games.find().toArray()
  for (const game of games) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!game.slots.some(slot => slot.status === undefined)) {
      continue
    }

    logger.info(`updating missing slot statuses for game #${game.number}`)
    await collections.games.updateOne(
      { _id: game._id },
      {
        $set: {
          slots: game.slots.map(slot => ({
            ...slot,
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            status: slot.status ?? 'active',
          })),
        },
      },
    )
  }
}
