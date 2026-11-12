import { test as setup } from '@playwright/test'
import { MongoClient } from 'mongodb'
import { resolve } from 'node:path'
import { users } from './data'

const authDir = resolve(import.meta.dirname, '.auth')

setup('authenticate', async ({ browser }) => {
  if (!process.env['MONGODB_URI']) {
    throw new Error('MONGODB_URI is required to seed test players')
  }

  const client = await MongoClient.connect(process.env['MONGODB_URI'])
  const players = client.db().collection('players')
  for (const user of users) {
    await players.updateOne(
      { steamId: user.steamId },
      {
        $set: {
          name: user.name,
          joinedAt: new Date(),
          avatar: {
            small: 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb.jpg',
            medium:
              'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg',
            large:
              'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg',
          },
          roles: 'roles' in user ? user.roles : [],
          hasAcceptedRules: 'hasAcceptedRules' in user ? user.hasAcceptedRules : true,
          cooldownLevel: 0,
          preferences: {},
          stats: {
            totalGames: 0,
            gamesByClass: {},
          },
        },
        $unset: {
          activeGame: 1,
          skill: 1,
          mumbleCertificate: 1,
        },
      },
      {
        upsert: true,
      },
    )
  }
  await client.close()

  await Promise.all(
    users
      .map(u => u.steamId)
      .map(async steamId => {
        const path = resolve(authDir, `${steamId}.json`)
        const context = await browser.newContext()
        const page = await context.newPage()
        await page.goto(`/auth/test?steamId=${steamId}`)
        await page.waitForURL(url => url.pathname === '/' || url.pathname.startsWith('/q/'))
        await context.storageState({ path })
        await context.close()
      }),
  )
})
