import { MongoClient } from 'mongodb'
import { test as setup } from '@playwright/test'
import { users } from './data'

const client = new MongoClient(process.env['MONGODB_URI']!)
await client.connect()
const db = client.db()
const collection = db.collection('players')

async function upsertPlayer(steamId: string, name: string) {
  await collection.updateOne(
    { steamId },
    {
      $set: {
        name,
        joinedAt: new Date(),
        avatar: {
          small: 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb.jpg',
          medium:
            'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg',
          large:
            'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg',
        },
        roles: [],
        hasAcceptedRules: true,
        cooldownLevel: 0,
      },
      $unset: {
        activeGame: 1,
        skill: 1,
      },
    },
    {
      upsert: true,
    },
  )
}

setup('create test users accounts', async () => {
  for (const user of users) {
    await upsertPlayer(user.steamId, user.name)
  }
})
