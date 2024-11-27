import { users } from '../data'
import { authUsers, expect } from '../fixtures/auth-users'

authUsers.use({ steamIds: [users[0].steamId, users[1].steamId] })
authUsers('banned player sees ban alert', async ({ users }) => {
  const player = users.getNext(u => !u.isAdmin)
  const playerPage = await player.queuePage()
  await playerPage.goto()

  const adminPage = await users.getAdmin().adminPage()
  await adminPage.banPlayer(player.steamId, { reason: 'testing' })

  const banAlert = (await player.page()).getByText('You are banned')
  await expect(banAlert).toBeVisible()
  await expect(banAlert).toHaveText(/^You are banned until\s*.+\s*for\s*testing\s*$/)

  await adminPage.revokeAllBans(player.steamId)
  await expect(banAlert).not.toBeVisible()
})
