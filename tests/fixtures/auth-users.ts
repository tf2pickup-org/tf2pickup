import { expect, test, type Page } from '@playwright/test'
import jsonwebtoken from 'jsonwebtoken'
import { minutesToMilliseconds } from 'date-fns'

export interface AuthUsersOptions {
  steamIds: string[]
}

interface AuthUsersFixture {
  pages: Map<string, Page>
}

export const authUsers = test.extend<AuthUsersOptions & AuthUsersFixture>({
  steamIds: [[], { option: true }],
  pages: async ({ steamIds, browser, baseURL }, use) => {
    // opening a new context takes some time
    test.setTimeout(minutesToMilliseconds(1))
    expect(process.env['AUTH_SECRET']).toBeDefined()

    let url = new URL('http://localhost')
    if (baseURL) {
      url = new URL(baseURL)
    }

    const pages = new Map<string, Page>()
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
        pages.set(steamId, page)
      }),
    )
    await use(pages)
    for (const page of pages.values()) {
      await page.close()
    }
    pages.clear()
  },
  page: async ({ page }, use) => {
    await page.goto('/')
    await use(page)
    await page.close()
  },
})

export { expect } from '@playwright/test'
