import { authUsers, expect } from '../fixtures/auth-users'

authUsers('banned player sees ban alert @6v6 @9v9', async ({ users }) => {
  const player = users.byName('AstraGirl')
  const playerPage = await player.queuePage()
  await playerPage.goto()

  const admin = users.getAdmin()
  const adminPage = await admin.adminPage()
  await adminPage.banPlayer(player.steamId, { reason: 'testing' })

  const banAlert = playerPage.page.getByText('You are banned')
  await expect(banAlert).toBeVisible()
  await expect(banAlert).toHaveText(
    new RegExp(`^You are banned until\\s*.+\\s*for\\s*testing\\s*by\\s*${admin.playerName}\\s*$`),
  )

  await adminPage.revokeAllBans(player.steamId)
  await expect(banAlert).not.toBeVisible()
})

authUsers('anonymously banned player does not see the admin @6v6 @9v9', async ({ users }) => {
  const player = users.byName('AstraGirl')
  const playerPage = await player.queuePage()
  await playerPage.goto()

  const admin = users.getAdmin()
  const adminPage = await admin.adminPage()
  await adminPage.banPlayer(player.steamId, { reason: 'testing', anonymous: true })

  const banAlert = playerPage.page.getByText('You are banned')
  await expect(banAlert).toBeVisible()
  await expect(banAlert).toHaveText(
    /^You are banned until\s*.+\s*for\s*testing\s*by\s*tf2pickup\.org Staff\s*$/,
  )

  await adminPage.revokeAllBans(player.steamId)
  await expect(banAlert).not.toBeVisible()
})
