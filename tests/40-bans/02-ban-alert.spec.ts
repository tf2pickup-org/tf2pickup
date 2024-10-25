import { users } from '../data'
import { authUsers, expect } from '../fixtures/auth-users'
import { AdminPage } from '../pages/admin.page'
import { QueuePage } from '../pages/queue.page'

authUsers.use({ steamIds: [users[0].steamId, users[1].steamId] })

authUsers('banned player sees ban alert', async ({ pages }) => {
  const player = new QueuePage(pages.get(users[1].steamId)!)

  const admin = users[0]
  const adminPage = new AdminPage(pages.get(admin.steamId)!)
  await adminPage.banPlayer(users[1].steamId, { reason: 'testing' })

  const banAlert = player.page.getByText('You are banned')
  await expect(banAlert).toBeVisible()
  await expect(banAlert).toHaveText(/^You are banned until\s*.+\s*for\s*testing\s*$/)

  await adminPage.revokeAllBans(users[1].steamId)

  await expect(banAlert).not.toBeVisible()
})
