import { accessMongoDb as test } from './access-mongo-db'
import { UserContext, UserManager, type UserSteamId } from '../user-manager'
import { users } from '../data'
import { resolve } from 'node:path'

interface AuthUsersFixture {
  steamIds: UserSteamId[]
  users: UserManager
}

export const authUsers = test.extend<AuthUsersFixture>({
  steamIds: async ({}, use) => {
    await use(users.map(u => u.steamId))
  },
  users: async ({ steamIds, browser }, use) => {
    const authDir = resolve(import.meta.dirname, '../.auth')
    const users = await Promise.all(
      steamIds.map(async steamId => {
        const path = resolve(authDir, `${steamId}.json`)
        const context = await browser.newContext({ storageState: path })
        return new UserContext(steamId, context)
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
