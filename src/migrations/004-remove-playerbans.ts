import type { ObjectId } from 'mongodb'
import { database } from '../database/database'
import { collections } from '../database/collections'
import { logger } from '../logger'

interface PlayerBanModel {
  player: ObjectId
  admin: ObjectId
  start: Date
  end: Date
  reason: string
}

export async function up() {
  const collection = database.collection<PlayerBanModel>('playerbans')
  const bans = await collection.find().toArray()
  for (const ban of bans) {
    const player = await collections.players.findOne({ _id: ban.player })
    if (player === null) {
      logger.warn(`actor ${ban.player.toString()} not found`)
      continue
    }

    const actor = await collections.players.findOne({ _id: ban.admin })
    if (actor === null) {
      logger.warn(`actor ${ban.admin.toString()} not found; was this bot?`)
    }

    await collections.players.updateOne(
      { steamId: player.steamId },
      {
        $push: {
          bans: {
            actor: actor?.steamId ?? 'bot',
            start: ban.start,
            end: ban.end,
            reason: ban.reason,
          },
        },
      },
    )

    await collection.deleteOne({ _id: ban._id })
  }

  await collection.drop()
}
