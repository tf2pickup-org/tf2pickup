import { expect, authUsers as test } from '../fixtures/auth-users'
import { loremIpsum } from 'lorem-ipsum'

test('chat prompt is invisible for unauthenticated users', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Chat' }).click()
  await expect(page.getByPlaceholder('Send message...')).not.toBeVisible()
  await expect(page.getByRole('button', { name: 'Send message' })).not.toBeVisible()
})

test('chat prompt is visible for authenticated users', async ({ users }) => {
  const page = await users.getNext().page()
  await page.goto('/')
  await page.getByRole('button', { name: 'Chat' }).click()
  await expect(page.getByPlaceholder('Send message...')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Send message' })).toBeVisible()
})

test('users are able to send messages to chat', async ({ users, page: originalPage }) => {
  await originalPage.goto('/')
  await originalPage.getByRole('button', { name: 'Chat' }).click()

  for (const user of users) {
    const page = await user.page()
    await page.goto('/')
    await page.getByRole('button', { name: 'Chat' }).click()

    const sentence = loremIpsum()
    await expect(page.getByText(sentence)).not.toBeVisible()
    await expect(originalPage.getByText(sentence)).not.toBeVisible()

    await page.getByPlaceholder('Send message...').fill(sentence)
    await page.getByRole('button', { name: 'Send message' }).click()

    await expect(page.getByText(sentence)).toBeVisible()
    await expect(originalPage.getByText(sentence)).toBeVisible()
    await expect(page.getByPlaceholder('Send message...')).toBeEmpty()

    await page.close()
  }
})
