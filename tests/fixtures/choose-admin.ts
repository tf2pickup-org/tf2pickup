import test from '@playwright/test'
import { users } from '../data'

export const chooseAdmin = test.extend<{ admin: (typeof users)[0] }>({
  admin: async ({}, use) => {
    const admin = users[0]
    await use(admin)
  },
})
