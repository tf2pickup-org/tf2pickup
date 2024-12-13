// Remove playerpreferences collection, merge its content with the players collection.

import type { ObjectId } from 'mongodb'
import { collections } from '../database/collections'
import { database } from '../database/database'

interface PlayerPreferencesModel {
  player: ObjectId
  preferences: {
    soundVolume?: string
  }
}

export async function up() {
  await collections.players.updateMany(
    { preferences: { $exists: false } },
    { $set: { preferences: {} } },
  )

  const preferences = await database
    .collection<PlayerPreferencesModel>('playerpreferences')
    .find()
    .toArray()
  for (const p of preferences) {
    if (!p.preferences.soundVolume) {
      continue
    }

    await collections.players.updateOne(
      { _id: p.player },
      { $set: { preferences: { soundVolume: parseFloat(p.preferences.soundVolume) } } },
    )
  }

  await database.collection('playerpreferences').drop()
}
