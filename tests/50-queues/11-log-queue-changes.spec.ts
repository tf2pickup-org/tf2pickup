import { expect, queues } from '../fixtures/queues'
import { AdminQueuesPage } from '../pages/admin-queues.page'

queues('queue changes show up in the activity log @multi-queue', async ({ queues, users }) => {
  const { slug } = await queues.create({ template: 'auto-bball', enable: true })
  const page = await users.getAdmin().page()
  const admin = new AdminQueuesPage(page)
  await admin.disable(slug)
  await admin.expectFlash(`Queue ${slug} disabled`)

  await page.goto(`/admin/queues/${slug}`)
  await page.getByLabel('Name', { exact: true }).fill('renamed')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Configuration saved')).toBeVisible()

  await page.goto('/admin/activity-log')
  await expect(page.getByText(`queues.${slug}`, { exact: true })).toBeVisible()
  await expect(page.getByText(`queues.${slug}.enabled`, { exact: true })).toHaveCount(2)
  await expect(page.getByText(`queues.${slug}.name`, { exact: true })).toBeVisible()
})
