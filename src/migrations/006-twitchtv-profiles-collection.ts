import type { ObjectId } from 'mongodb'
import { database } from '../database/database'
import { collections } from '../database/collections'
import { logger } from '../logger'

interface TwitchTvProfileModel {
  player: ObjectId
  userId: string
  login: string
  displayName: string
  profileImageUrl: string
}

export async function up() {
  const collection = database.collection<TwitchTvProfileModel>('twitchtvprofiles')
  const profiles = await collection.find().toArray()
  for (const profile of profiles) {
    const player = await collections.players.findOne({ _id: profile.player })
    if (player === null) {
      logger.warn(`player ${profile.player.toString()} not found`)
      continue
    }

    await collections.players.updateOne(
      { _id: profile.player },
      {
        $set: {
          twitchTvProfile: {
            userId: profile.userId,
            login: profile.login,
            displayName: profile.displayName,
            profileImageUrl: profile.profileImageUrl,
          },
        },
      },
    )
  }

  await collection.drop()
}
