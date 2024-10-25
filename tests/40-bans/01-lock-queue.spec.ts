import { users } from '../data'
import { authUsers, expect } from '../fixtures/auth-users'
import { AdminPage } from '../pages/admin.page'
import { QueuePage } from '../pages/queue.page'

authUsers.use({ steamIds: [users[0].steamId, users[1].steamId] })

authUsers('banned player gets kicked from the queue', async ({ pages }) => {
  const player = new QueuePage(pages.get(users[1].steamId)!)
  await player.joinQueue(0)

  const admin = users[0]
  const adminPage = new AdminPage(pages.get(admin.steamId)!)
  await adminPage.banPlayer(users[1].steamId, { reason: 'test' })

  await expect(player.slot(0).joinButton()).toBeDisabled()

  await adminPage.revokeAllBans(users[1].steamId)

  await expect(player.slot(0).joinButton()).toBeEnabled()
})
