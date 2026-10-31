import { expect, queues } from '../fixtures/queues'
import { AdminQueuesPage } from '../pages/admin-queues.page'
import { queuePresets } from '../../src/queues/presets'

for (const preset of queuePresets) {
  queues(
    `creates a queue from the ${preset.slug} preset @multi-queue`,
    async ({ queues, users }) => {
      const { slug } = await queues.create({ template: preset.slug })
      const page = await users.getAdmin().page()
      const admin = new AdminQueuesPage(page)

      await admin.goto()
      const row = admin.row(slug)
      await expect(row).toContainText(preset.gamemode)
      await expect(row.getByRole('button', { name: 'Enable' })).toBeVisible()

      await page.goto(`/admin/queues/${slug}`)
      await expect(page.getByLabel('Player skill threshold', { exact: true })).toBeChecked({
        checked: preset.skillThreshold !== undefined,
      })
      if (preset.skillThreshold !== undefined) {
        await expect(page.getByLabel('Player skill threshold value', { exact: true })).toHaveValue(
          String(preset.skillThreshold),
        )
      }
      await expect(page.getByLabel('Require player verification')).toBeChecked({
        checked: preset.requireVerification ?? false,
      })

      expect(await (await users.getAdmin().adminPage()).mapPool(slug)).toEqual(
        preset.maps.map(({ name, execConfig }) => ({ name, execConfig })),
      )
    },
  )
}
