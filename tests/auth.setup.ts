import { accessMongoDb as setup } from './fixtures/access-mongo-db'
import { resolve } from 'node:path'
import { users } from './data'
import { existsSync } from 'node:fs'

const authDir = resolve(import.meta.dirname, '.auth')

// eslint-disable-next-line @typescript-eslint/no-deprecated
setup('authenticate', async ({ browser, db }) => {
  const players = db.collection('players')
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
          hasAcceptedRules: true,
          cooldownLevel: 0,
          preferences: {},
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

  await Promise.all(
    users
      .map(u => u.steamId)
      .map(async steamId => {
        const path = resolve(authDir, `${steamId}.json`)
        if (existsSync(path)) {
          return
        }

        const context = await browser.newContext()
        const page = await context.newPage()
        await page.goto(`/auth/test?steamId=${steamId}`)
        await page.waitForURL('/')
        await page.context().storageState({ path })
      }),
  )
})
