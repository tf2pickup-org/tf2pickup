import { users } from '../data'
import { authUsers } from '../fixtures/auth-users'

authUsers.use({ steamIds: [users[0].steamId] })
authUsers('admin panel is visible & accessible', async ({ users }) => {
  const adminsPage = await users.getAdmin().page()
  await adminsPage.goto('/')
  await adminsPage.getByRole('link', { name: 'Admin panel' }).click()
  await adminsPage.waitForURL(/admin/)
})
