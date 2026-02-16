import { accessMongoDb as test } from './access-mongo-db'
import { UserContext, UserManager, type UserSteamId } from '../user-manager'
import { users } from '../data'
import { resolve } from 'node:path'

interface AuthUsersFixture {
  steamIds: UserSteamId[]
  users: UserManager
}

// eslint-disable-next-line @typescript-eslint/no-deprecated
export const authUsers = test.extend<AuthUsersFixture>({
  steamIds: async ({}, use) => {
    await use(users.map(u => u.steamId))
  },
  users: async ({ steamIds, browser }, use) => {
    const authDir = resolve(import.meta.dirname, '../.auth')
    const users = steamIds.map(steamId => {
      const path = resolve(authDir, `${steamId}.json`)
      return new UserContext(steamId, () => browser.newContext({ storageState: path }))
    })
    await use(new UserManager(users))
    for (const user of users) {
      await user.close()
    }
  },
})

export { expect } from '@playwright/test'
