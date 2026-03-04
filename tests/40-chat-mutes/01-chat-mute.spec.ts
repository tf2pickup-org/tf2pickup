import { authUsers, expect } from '../fixtures/auth-users'

authUsers('chat mutes tab is empty for a player with no mutes @6v6 @9v9', async ({ users }) => {
  const player = users.byName('AstraGirl')
  const adminPage = await users.getAdmin().adminPage()
  await adminPage.page.goto(`/players/${player.steamId}/edit/chat-mutes`)
  await expect(adminPage.page.getByText('No chat mutes')).toBeVisible()
})

authUsers('admin can add a chat mute @6v6 @9v9', async ({ users }) => {
  const player = users.byName('AstraGirl')
  const adminPage = await users.getAdmin().adminPage()

  await adminPage.muteChatPlayer(player.steamId, { reason: 'test mute' })

  await expect(adminPage.page.getByText('test mute')).toBeVisible()

  await adminPage.revokeAllChatMutes(player.steamId)
})

authUsers(
  'muted player sees disabled chat input and can type again after revocation @6v6 @9v9',
  async ({ users }) => {
    const player = users.byName('AstraGirl')
    const playerPage = await player.page()
    await playerPage.goto('/')
    await playerPage.getByRole('button', { name: 'Chat' }).click()
    await expect(playerPage.getByPlaceholder('Send message...')).toBeVisible()

    const adminPage = await users.getAdmin().adminPage()
    await adminPage.muteChatPlayer(player.steamId, { reason: 'silence' })

    await playerPage.reload()
    await playerPage.getByRole('button', { name: 'Chat' }).click()
    await expect(playerPage.getByPlaceholder('you are currently muted')).toBeVisible()
    await expect(playerPage.getByPlaceholder('you are currently muted')).toBeDisabled()
    await expect(playerPage.getByPlaceholder('Send message...')).not.toBeVisible()

    await adminPage.revokeAllChatMutes(player.steamId)

    await playerPage.reload()
    await playerPage.getByRole('button', { name: 'Chat' }).click()
    await expect(playerPage.getByPlaceholder('Send message...')).toBeVisible()
  },
)
