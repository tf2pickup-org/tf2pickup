import { expect, queues } from '../fixtures/queues'

queues('queue settings can be edited as a nerd @multi-queue', async ({ queues, users }) => {
  const { slug } = await queues.create({ template: 'auto-bball' })
  const page = await users.getAdmin().page()
  const key = `queues.${slug}.mapCooldown`

  await page.goto('/admin/view-for-nerds')
  const input = page.getByLabel(key, { exact: true })
  await expect(input).toHaveValue('2')
  await input.fill('5')
  await input.press('Enter')
  await expect(page.getByLabel(key, { exact: true })).toHaveValue('5')

  await page.goto(`/admin/queues/${slug}`)
  await expect(page.getByLabel('Map cooldown')).toHaveValue('5')

  await page.goto('/admin/view-for-nerds')
  await page
    .locator('form', { has: page.getByLabel(key, { exact: true }) })
    .getByRole('button', { name: 'Reset default' })
    .click()
  await expect(page.getByLabel(key, { exact: true })).toHaveValue('2')
})
