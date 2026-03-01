import { expect, authUsers as test } from '../fixtures/auth-users'
import { loremIpsum } from 'lorem-ipsum'

test('chat is not visible for unauthenticated users @6v6 @9v9', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Chat' }).click()
  await expect(page.getByText('You need to sign in to see the chat.')).toBeVisible()
  await expect(page.getByPlaceholder('Send message...')).not.toBeVisible()
  await expect(page.getByRole('button', { name: 'Send message' })).not.toBeVisible()
})

test('chat is visible for authenticated users @6v6 @9v9', async ({ users }) => {
  const page = await users.getNext().page()
  await page.goto('/')
  await page.getByRole('button', { name: 'Chat' }).click()
  await expect(page.getByPlaceholder('Send message...')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Send message' })).toBeVisible()
})

test('users are able to send messages to chat @6v6 @9v9', async ({ users }) => {
  for (const user of users) {
    const page = await user.page()
    await page.goto('/')
    await page.getByRole('button', { name: 'Chat' }).click()
  }

  for (const user of users) {
    const page = await user.page()

    const sentence = loremIpsum()
    await expect(page.getByText(sentence)).not.toBeVisible()

    await page.getByPlaceholder('Send message...').fill(sentence)
    await page.getByRole('button', { name: 'Send message' }).click()
    await expect(page.getByPlaceholder('Send message...')).toBeEmpty()

    for (const anotherUser of users) {
      const page = await anotherUser.page()
      await expect(page.getByText(sentence)).toBeVisible()
    }
  }
})

test('player mentions are rendered as profile links @6v6 @9v9', async ({ users }) => {
  const [sender, receiver] = users.getMany(2)

  for (const user of [sender, receiver]) {
    const page = await user.page()
    await page.goto('/')
    await page.getByRole('button', { name: 'Chat' }).click()
  }

  const uniqueSuffix = `dodawaj sie ${Date.now()}`

  const senderPage = await sender.page()
  await senderPage
    .getByPlaceholder('Send message...')
    .fill(`@${receiver.playerName} ${uniqueSuffix}`)
  await senderPage.getByRole('button', { name: 'Send message' }).click()
  await expect(senderPage.getByPlaceholder('Send message...')).toBeEmpty()

  for (const user of [sender, receiver]) {
    const page = await user.page()
    const message = page.getByText(uniqueSuffix)
    await expect(message).toBeVisible()
    const mention = message.getByRole('link', { name: `@${receiver.playerName}` })
    await expect(mention).toBeVisible()
    await expect(mention).toHaveAttribute('href', `/players/${receiver.steamId}`)
    await expect(mention).toHaveClass(/mention/)
  }
})

test('mention completion dropdown appears when typing @ @6v6 @9v9', async ({ users }) => {
  const [user1, user2] = users.getMany(2)

  // Both users must be on the page so they appear in online players
  for (const user of [user1, user2]) {
    const page = await user.page()
    await page.goto('/')
    await page.getByRole('button', { name: 'Chat' }).click()
  }

  const page = await user1.page()
  const input = page.getByPlaceholder('Send message...')
  const dropdown = page.locator('#mention-completion')

  await expect(dropdown).toBeHidden()
  await input.focus()
  await input.pressSequentially('@')
  await expect(dropdown).toBeVisible()
  await expect(dropdown.locator('li')).not.toHaveCount(0)
  // The other user should appear in the list
  await expect(dropdown.locator('li', { hasText: user2.playerName })).toBeVisible()
})

test('mention completion filters by typed query @6v6 @9v9', async ({ users }) => {
  const [user1, user2] = users.getMany(2)

  for (const user of [user1, user2]) {
    const page = await user.page()
    await page.goto('/')
    await page.getByRole('button', { name: 'Chat' }).click()
  }

  const page = await user1.page()
  const input = page.getByPlaceholder('Send message...')
  const dropdown = page.locator('#mention-completion')

  await input.focus()
  // Type @ followed by enough characters to uniquely match user2
  await input.pressSequentially(`@${user2.playerName.substring(0, 3)}`)
  await expect(dropdown).toBeVisible()
  await expect(dropdown.locator('li', { hasText: user2.playerName })).toBeVisible()
})

test('mention completion keyboard navigation and Enter accepts @6v6 @9v9', async ({ users }) => {
  const [user1, user2] = users.getMany(2)

  // Both users must be online so dropdown has at least 2 items
  for (const user of [user1, user2]) {
    const page = await user.page()
    await page.goto('/')
    await page.getByRole('button', { name: 'Chat' }).click()
  }

  const page = await user1.page()
  const input = page.getByPlaceholder('Send message...')
  const dropdown = page.locator('#mention-completion')

  await input.focus()
  await input.pressSequentially('@')
  await expect(dropdown).toBeVisible()

  // First item should be selected by default
  const firstItem = dropdown.locator('li').first()
  await expect(firstItem).toHaveAttribute('aria-selected', 'true')

  // Navigate down and accept with Enter
  await input.press('ArrowDown')
  const secondItem = dropdown.locator('li').nth(1)
  await expect(secondItem).toHaveAttribute('aria-selected', 'true')

  const selectedName = await secondItem.getAttribute('data-name')
  await input.press('Enter')

  // Dropdown should close and input should contain the mention
  await expect(dropdown).toBeHidden()
  await expect(input).toHaveValue(
    new RegExp(`@${selectedName!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s`),
  )
})

test('mention completion Escape closes dropdown @6v6 @9v9', async ({ users }) => {
  const [user1, user2] = users.getMany(2)

  // Both users must be online so dropdown has items to show
  for (const user of [user1, user2]) {
    const page = await user.page()
    await page.goto('/')
    await page.getByRole('button', { name: 'Chat' }).click()
  }

  const page = await user1.page()
  const input = page.getByPlaceholder('Send message...')
  const dropdown = page.locator('#mention-completion')

  await input.focus()
  await input.pressSequentially('@')
  await expect(dropdown).toBeVisible()

  await input.press('Escape')
  await expect(dropdown).toBeHidden()
})

test('mention completion click accepts selection @6v6 @9v9', async ({ users }) => {
  const [user1, user2] = users.getMany(2)

  for (const user of [user1, user2]) {
    const page = await user.page()
    await page.goto('/')
    await page.getByRole('button', { name: 'Chat' }).click()
  }

  const page = await user1.page()
  const input = page.getByPlaceholder('Send message...')
  const dropdown = page.locator('#mention-completion')

  await input.focus()
  await input.pressSequentially(`@${user2.playerName.substring(0, 3)}`)
  await expect(dropdown).toBeVisible()

  const targetItem = dropdown.locator('li', { hasText: user2.playerName })
  await expect(targetItem).toBeVisible()
  await targetItem.click()

  await expect(dropdown).toBeHidden()
  await expect(input).toHaveValue(new RegExp(`@${user2.playerName}`))
})

test('mention completion round-trip: complete and send @6v6 @9v9', async ({ users }) => {
  const [sender, receiver] = users.getMany(2)

  for (const user of [sender, receiver]) {
    const page = await user.page()
    await page.goto('/')
    await page.getByRole('button', { name: 'Chat' }).click()
  }

  const senderPage = await sender.page()
  const input = senderPage.getByPlaceholder('Send message...')
  const dropdown = senderPage.locator('#mention-completion')

  // Use completion to insert mention
  await input.focus()
  await input.pressSequentially(`@${receiver.playerName.substring(0, 3)}`)
  await expect(dropdown).toBeVisible()

  const targetItem = dropdown.locator('li', { hasText: receiver.playerName })
  await targetItem.click()
  await expect(dropdown).toBeHidden()

  // Add some text after the mention and send
  const uniqueSuffix = `test completion ${Date.now()}`
  await input.pressSequentially(uniqueSuffix)
  await senderPage.getByRole('button', { name: 'Send message' }).click()
  await expect(input).toBeEmpty()

  // Verify the mention rendered as a link for both users
  for (const user of [sender, receiver]) {
    const page = await user.page()
    const message = page.getByText(uniqueSuffix)
    await expect(message).toBeVisible()
    const mention = message.getByRole('link', { name: `@${receiver.playerName}` })
    await expect(mention).toBeVisible()
    await expect(mention).toHaveAttribute('href', `/players/${receiver.steamId}`)
    await expect(mention).toHaveClass(/mention/)
  }
})

test('delete button is not visible for non-admin users @6v6 @9v9', async ({ users }) => {
  const [admin, nonAdmin] = [users.getAdmin(), users.getNext(u => !u.isAdmin)]

  for (const user of [admin, nonAdmin]) {
    const page = await user.page()
    await page.goto('/')
    await page.getByRole('button', { name: 'Chat' }).click()
  }

  const sentence = `delete-btn-test ${Date.now()}`
  const adminPage = await admin.page()
  await adminPage.getByPlaceholder('Send message...').fill(sentence)
  await adminPage.getByRole('button', { name: 'Send message' }).click()
  await expect(adminPage.getByPlaceholder('Send message...')).toBeEmpty()

  const nonAdminPage = await nonAdmin.page()
  await expect(nonAdminPage.getByText(sentence)).toBeVisible()
  const message = nonAdminPage.locator('p.chat-message', { hasText: sentence })
  await message.hover()
  await expect(message.getByTitle('Delete message')).not.toBeVisible()
})

test('delete button is visible on hover for admin users @6v6 @9v9', async ({ users }) => {
  const [admin, nonAdmin] = [users.getAdmin(), users.getNext(u => !u.isAdmin)]

  for (const user of [admin, nonAdmin]) {
    const page = await user.page()
    await page.goto('/')
    await page.getByRole('button', { name: 'Chat' }).click()
  }

  const sentence = `delete-btn-admin-test ${Date.now()}`
  const nonAdminPage = await nonAdmin.page()
  await nonAdminPage.getByPlaceholder('Send message...').fill(sentence)
  await nonAdminPage.getByRole('button', { name: 'Send message' }).click()
  await expect(nonAdminPage.getByPlaceholder('Send message...')).toBeEmpty()

  const adminPage = await admin.page()
  await expect(adminPage.getByText(sentence)).toBeVisible()
  const message = adminPage.locator('p.chat-message', { hasText: sentence })
  await message.hover()
  await expect(message.getByTitle('Delete message')).toBeVisible()
})

test('admin can delete a chat message @6v6 @9v9', async ({ users }) => {
  const [admin, nonAdmin] = [users.getAdmin(), users.getNext(u => !u.isAdmin)]

  for (const user of [admin, nonAdmin]) {
    const page = await user.page()
    await page.goto('/')
    await page.getByRole('button', { name: 'Chat' }).click()
  }

  const sentence = `delete-me ${Date.now()}`
  const nonAdminPage = await nonAdmin.page()
  await nonAdminPage.getByPlaceholder('Send message...').fill(sentence)
  await nonAdminPage.getByRole('button', { name: 'Send message' }).click()
  await expect(nonAdminPage.getByPlaceholder('Send message...')).toBeEmpty()

  const adminPage = await admin.page()
  await expect(adminPage.getByText(sentence)).toBeVisible()
  const message = adminPage.locator('p.chat-message', { hasText: sentence })
  await message.hover()
  adminPage.once('dialog', dialog => dialog.accept())
  await message.getByTitle('Delete message').click()

  await expect(adminPage.getByText(sentence)).not.toBeVisible()
  await expect(nonAdminPage.getByText(sentence)).not.toBeVisible()
})

test('links inside chat messages are clickable @6v6 @9v9', async ({ users }) => {
  const [sender, receiver] = users.getMany(2)

  for (const user of [sender, receiver]) {
    const page = await user.page()
    await page.goto('/')
    await page.getByRole('button', { name: 'Chat' }).click()
  }

  const uniqueUrl = `https://example.com/${Date.now()}`

  const senderPage = await sender.page()
  await senderPage.getByPlaceholder('Send message...').fill(uniqueUrl)
  await senderPage.getByRole('button', { name: 'Send message' }).click()
  await expect(senderPage.getByPlaceholder('Send message...')).toBeEmpty()

  for (const user of [sender, receiver]) {
    const page = await user.page()
    const link = page.getByRole('link', { name: uniqueUrl })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', uniqueUrl)
    await expect(link).toHaveAttribute('target', '_blank')
    await expect(link).toHaveAttribute('rel', 'noreferrer noopener')
  }
})
