import { ObjectId } from 'mongodb'
import { collections } from '../database/collections'
import { logger } from '../logger'

export async function up() {
  const cursor = collections.playerActions.find({})
  let nUpdated = 0
  let nDeleted = 0

  while (await cursor.hasNext()) {
    const action = await cursor.next()
    if (action && ObjectId.isValid(action.player)) {
      const player = await collections.players.findOne({ _id: action.player })
      if (!player) {
        logger.warn(`could not find player _id=${action.player}. Removing this action from logs`)
        await collections.playerActions.deleteOne({ _id: action._id })
        nDeleted += 1
        continue
      }

      await collections.playerActions.updateOne(
        { _id: action._id },
        { $set: { player: player.steamId } },
      )
      nUpdated += 1
    }
  }

  logger.info(`updated ${nUpdated} player action logs; deleted ${nDeleted} entries`)
}
