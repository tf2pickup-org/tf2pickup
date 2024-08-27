import { users } from '../data'
import { authUsers } from '../fixtures/auth-users'

authUsers.use({ steamIds: [users[0].steamId] })
authUsers('admin panel is visible & accessible', async ({ pages }) => {
  const admin = users[0]
  const adminsPage = pages.get(admin.steamId)!

  await adminsPage.getByRole('link', { name: 'Admin panel' }).click()
  await adminsPage.waitForURL(/admin/)
})
