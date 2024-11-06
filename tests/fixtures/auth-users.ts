import { expect, test } from '@playwright/test'
import jsonwebtoken from 'jsonwebtoken'
import { minutesToMilliseconds } from 'date-fns'
import { UserContext, UserManager } from '../user-manager'

export interface AuthUsersOptions {
  steamIds: string[]
}

interface AuthUsersFixture {
  users: UserManager
}

export const authUsers = test.extend<AuthUsersOptions & AuthUsersFixture>({
  steamIds: [[], { option: true }],
  users: async ({ steamIds, browser, baseURL }, use) => {
    // opening a new context takes some time
    test.setTimeout(minutesToMilliseconds(1))
    expect(process.env['AUTH_SECRET']).toBeDefined()

    let url = new URL('http://localhost')
    if (baseURL) {
      url = new URL(baseURL)
    }

    const users: UserContext[] = []
    await Promise.all(
      steamIds.map(async steamId => {
        const context = await browser.newContext()
        const token = jsonwebtoken.sign({ id: steamId }, process.env['AUTH_SECRET']!, {
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
        await context.grantPermissions(['notifications'])
        const page = await context.newPage()
        await page.goto('/')
        users.push(new UserContext(steamId, page))
      }),
    )
    await use(new UserManager(users))
    for (const user of users) {
      await user.page.context().close()
      await user.page.close()
    }
    users.length = 0
  },
  page: async ({ page }, use) => {
    await page.goto('/')
    await use(page)
    await page.close()
  },
})

export { expect } from '@playwright/test'
