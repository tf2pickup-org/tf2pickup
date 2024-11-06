import { users } from '../data'
import { authUsers, expect } from '../fixtures/auth-users'
import type { QueuePage } from '../pages/queue.page'

authUsers.use({ steamIds: [users[0].steamId, users[1].steamId, users[2].steamId] })

authUsers('mark as friend', async ({ users }) => {
  const [medic1, medic2, soldier] = users.getMany(3).map(user => user.queuePage()) as [
    QueuePage,
    QueuePage,
    QueuePage,
  ]
  await medic1.joinQueue(10)
  await medic2.joinQueue(11)
  await soldier.joinQueue(4)

  await expect(soldier.markAsFriendButton(10)).not.toBeVisible()

  const markAsFriendBtn1Medic1 = medic1.markAsFriendButton(4)
  await expect(markAsFriendBtn1Medic1).toBeVisible()
  await expect(markAsFriendBtn1Medic1).toBeEnabled()
  await expect(markAsFriendBtn1Medic1).not.toHaveClass(/selected/)
  await markAsFriendBtn1Medic1.click()

  const unfriendButton = medic1.unfriendButton(4)
  await expect(unfriendButton).toBeVisible()
  await expect(unfriendButton).toBeEnabled()
  await expect(unfriendButton).toHaveClass(/selected/)

  const markAsFriendBtn1Medic2 = medic2.markAsFriendButton(4)
  await expect(markAsFriendBtn1Medic2).toBeVisible()
  await expect(markAsFriendBtn1Medic2).toBeDisabled()

  await medic1.leaveQueue()
  await expect(markAsFriendBtn1Medic2).toBeVisible()
  await expect(markAsFriendBtn1Medic2).toBeEnabled()

  await medic2.leaveQueue()
  await soldier.leaveQueue()
})
