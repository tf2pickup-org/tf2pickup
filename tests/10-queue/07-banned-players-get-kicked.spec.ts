import { users } from '../data'
import { authUsers, expect } from '../fixtures/auth-users'
import { QueuePage } from '../pages/queue.page'

authUsers.use({ steamIds: [users[0].steamId, users[1].steamId] })

authUsers('banned player gets kicked', async ({ steamIds, pages }) => {
  const player = new QueuePage(pages.get(users[1].steamId)!)
  await player.joinQueue(0)

  const admin = users[0]
  const adminPage = pages.get(admin.steamId)!
  await adminPage.goto(`/players/${steamIds[1]}`)
  await adminPage.getByRole('link', { name: 'Edit player' }).click()
  await adminPage.getByRole('link', { name: 'Bans' }).click()
  await adminPage.getByRole('link', { name: 'Add ban' }).click()
  await adminPage.getByLabel('Reason').fill('Cheating')
  await adminPage.getByRole('button', { name: 'Save' }).click()

  await expect(player.slot(0).joinButton()).toBeDisabled()
})
