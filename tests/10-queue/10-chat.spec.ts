import { expect, authUsers as test } from '../fixtures/auth-users'
import { loremIpsum } from 'lorem-ipsum'

test('chat is not visible for unauthenticated users', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Chat' }).click()
  await expect(page.getByText('You need to sign in to see the chat.')).toBeVisible()
  await expect(page.getByPlaceholder('Send message...')).not.toBeVisible()
  await expect(page.getByRole('button', { name: 'Send message' })).not.toBeVisible()
})

test('chat is visible for authenticated users', async ({ users }) => {
  const page = await users.getNext().page()
  await page.goto('/')
  await page.getByRole('button', { name: 'Chat' }).click()
  await expect(page.getByPlaceholder('Send message...')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Send message' })).toBeVisible()
})

test('users are able to send messages to chat', async ({ users }) => {
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
