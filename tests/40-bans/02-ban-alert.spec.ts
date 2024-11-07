import { users } from '../data'
import { authUsers, expect } from '../fixtures/auth-users'

authUsers.use({ steamIds: [users[0].steamId, users[1].steamId] })
authUsers('banned player sees ban alert', async ({ users }) => {
  const player = users.getNext(u => !u.isAdmin)
  const playerPage = player.queuePage()
  await playerPage.goto()

  const admin = users.getAdmin()
  const adminPage = admin.adminPage()
  await adminPage.banPlayer(player.steamId, { reason: 'testing' })

  const banAlert = player.page.getByText('You are banned')
  await expect(banAlert).toBeVisible()
  await expect(banAlert).toHaveText(/^You are banned until\s*.+\s*for\s*testing\s*$/)

  await adminPage.revokeAllBans(player.steamId)
  await expect(banAlert).not.toBeVisible()
})
