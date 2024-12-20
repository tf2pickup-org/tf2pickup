import { randomBytes as randomBytesCb } from 'node:crypto'
import { expect, accessMongoDb as test } from './access-mongo-db'
import jsonwebtoken from 'jsonwebtoken'
import { minutesToMilliseconds } from 'date-fns'
import { UserContext, UserManager, type UserSteamId } from '../user-manager'
import { promisify } from 'node:util'
import { users } from '../data'

interface AuthUsersFixture {
  steamIds: UserSteamId[]
  users: UserManager
  usersCreatedInDb: void
}

const randomBytes = promisify(randomBytesCb)

export const authUsers = test.extend<AuthUsersFixture>({
  steamIds: async ({}, use) => {
    await use(users.map(u => u.steamId))
  },
  usersCreatedInDb: [
    async ({ db }, use) => {
      const players = db.collection('players')
      for (const user of users) {
        await players.updateOne(
          { steamId: user.steamId },
          {
            $set: {
              name: user.name,
              joinedAt: new Date(),
              avatar: {
                small:
                  'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb.jpg',
                medium:
                  'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg',
                large:
                  'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg',
              },
              roles: 'roles' in user ? (user.roles ?? []) : [],
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
      await use()
    },
    { auto: true },
  ],
  users: async ({ db, steamIds, browser, baseURL }, use) => {
    // opening a new context takes some time
    test.setTimeout(minutesToMilliseconds(1))

    const collection = db.collection('secrets')
    const secret = (await collection.findOne({ name: 'auth' })) as {
      name: string
      value: string
    } | null
    let authSecret: Buffer
    if (secret === null) {
      const value = await randomBytes(32)
      await collection.insertOne({ name: 'auth', value: value.toString('hex') })
      authSecret = value
    } else {
      authSecret = Buffer.from(secret.value, 'hex')
    }
    expect(authSecret).toBeTruthy()

    let url = new URL('http://localhost')
    if (baseURL) {
      url = new URL(baseURL)
    }

    const users: UserContext[] = []
    await Promise.all(
      steamIds.map(async steamId => {
        const context = await browser.newContext()
        const token = jsonwebtoken.sign({ id: steamId }, authSecret, {
          expiresIn: '7d',
        })
        await context.addCookies([
          {
            name: 'token',
            value: token,
            domain: url.hostname,
            path: '/',
            httpOnly: true,
            secure: false,
            sameSite: 'Lax',
          },
        ])
        users.push(new UserContext(steamId, context))
      }),
    )
    await use(new UserManager(users))
    for (const user of users) {
      await user.close()
    }
    users.length = 0
  },
})

export { expect } from '@playwright/test'
