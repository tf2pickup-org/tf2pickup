import { users } from '../data'
import { authUsers, expect } from '../fixtures/auth-users'

authUsers(
  users[0].steamId,
  users[1].steamId,
  users[2].steamId,
)('mark as friend', async ({ pages }) => {
  const [medic1, medic2, soldier] = [
    pages.get(users[0].steamId)!,
    pages.get(users[1].steamId)!,
    pages.get(users[2].steamId)!,
  ]
  await medic1.getByLabel('Join queue on slot 10', { exact: true }).click()
  await medic2.getByLabel('Join queue on slot 11', { exact: true }).click()
  await soldier.getByLabel('Join queue on slot 4', { exact: true }).click()

  await expect(
    soldier.getByLabel('Queue slot 10').getByRole('button', { name: 'Mark as friend' }),
  ).not.toBeVisible()

  let markAsFriendBtn1Medic1 = medic1
    .getByLabel('Queue slot 4')
    .getByRole('button', { name: 'Mark as friend' })
  await expect(markAsFriendBtn1Medic1).toBeVisible()
  await expect(markAsFriendBtn1Medic1).toBeEnabled()
  await expect(markAsFriendBtn1Medic1).not.toHaveClass(/selected/)
  await markAsFriendBtn1Medic1.click()

  markAsFriendBtn1Medic1 = medic1
    .getByLabel('Queue slot 4')
    .getByRole('button', { name: 'Unfriend' })
  await expect(markAsFriendBtn1Medic1).toBeVisible()
  await expect(markAsFriendBtn1Medic1).toBeEnabled()
  await expect(markAsFriendBtn1Medic1).toHaveClass(/selected/)

  const markAsFriendBtn1Medic2 = medic2
    .getByLabel('Queue slot 4')
    .getByRole('button', { name: 'Mark as friend' })
  await expect(markAsFriendBtn1Medic2).toBeVisible()
  await expect(markAsFriendBtn1Medic2).toBeDisabled()

  await medic1.getByLabel('Leave queue', { exact: true }).click()
  await expect(markAsFriendBtn1Medic2).toBeVisible()
  await expect(markAsFriendBtn1Medic2).toBeEnabled()

  await medic2.getByLabel('Leave queue', { exact: true }).click()
  await soldier.getByLabel('Leave queue', { exact: true }).click()
})
