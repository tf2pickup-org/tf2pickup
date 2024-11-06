import { users } from '../data'
import { authUsers, expect } from '../fixtures/auth-users'

authUsers.use({ steamIds: [users[0].steamId, users[1].steamId] })
authUsers('banned player gets kicked from the queue', async ({ users }) => {
  const player = users.getNext(u => !u.isAdmin)
  const playerPage = player.queuePage()
  await playerPage.goto()
  await playerPage.joinQueue(0)

  const adminPage = users.getAdmin().adminPage()
  await adminPage.banPlayer(player.steamId, { reason: 'test' })

  await expect(playerPage.slot(0).joinButton()).toBeDisabled()

  await adminPage.revokeAllBans(player.steamId)

  await expect(playerPage.slot(0).joinButton()).toBeEnabled()
})
