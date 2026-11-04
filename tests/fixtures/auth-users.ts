import { test } from '@playwright/test'
import { UserContext, UserManager, type UserSteamId } from '../user-manager'
import { users } from '../data'
import { resolve } from 'node:path'

interface AuthUsersFixture {
  steamIds: UserSteamId[]
  users: UserManager
}

export const authUsers = test.extend<AuthUsersFixture>({
  steamIds: async ({}, use) => {
    await use(users.filter(u => !('hasAcceptedRules' in u)).map(u => u.steamId))
  },
  users: async ({ steamIds, browser }, use) => {
    const authDir = resolve(import.meta.dirname, '../.auth')
    const users = steamIds.map(steamId => {
      const path = resolve(authDir, `${steamId}.json`)
      return new UserContext(steamId, () => browser.newContext({ storageState: path }))
    })
    await use(new UserManager(users))
    for (const user of users) {
      await user.dispose()
    }
  },
})
