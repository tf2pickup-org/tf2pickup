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
