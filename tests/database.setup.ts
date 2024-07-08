import { MongoClient } from 'mongodb'
import { test as setup } from '@playwright/test'
import { users } from './data'

const client = new MongoClient(process.env['MONGODB_URI']!)
await client.connect()
const db = client.db()
const players = db.collection('players')
const games = db.collection('games')

async function upsertPlayer({
  steamId,
  name,
  roles,
}: {
  steamId: string
  name: string
  roles?: readonly string[]
}) {
  await players.updateOne(
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
        roles: roles ?? [],
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
  await games.updateMany(
    { state: { $in: ['created', 'launching', 'configuring'] } },
    { $set: { state: 'interrupted' } },
  )

  for (const user of users) {
    await upsertPlayer(user)
  }
})
