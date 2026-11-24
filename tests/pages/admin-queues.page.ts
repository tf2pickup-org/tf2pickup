import { expect, type Page } from '@playwright/test'

export class AdminQueuesPage {
  constructor(public readonly page: Page) {}

  async goto() {
    await this.page.goto('/admin/queues')
  }

  row(slug: string) {
    return this.page.getByRole('row', { name: `Queue ${slug}`, exact: true })
  }

  async create(props: {
    slug: string
    name: string
    template?: string | undefined
    gamemode?: string | undefined
    launchMode?: 'auto' | 'captain' | undefined
  }) {
    await this.goto()
    await this.page.getByLabel('Start from').selectOption(props.template ?? '')
    await this.page.getByLabel('Name', { exact: true }).fill(props.name)
    await this.page.getByLabel('Slug').fill(props.slug)
    if (props.launchMode) {
      await this.page.getByLabel('Launch mode').selectOption(props.launchMode)
    }
    if (props.gamemode) {
      await this.page.getByLabel('Gamemode (blank queues only)').selectOption(props.gamemode)
    }
    await this.page.getByRole('button', { name: 'Add queue' }).click()
  }

  enabledSwitch(slug: string) {
    return this.row(slug).getByRole('switch', { name: `Queue ${slug} enabled` })
  }

  async enable(slug: string) {
    await this.toggle(slug, 'enable')
  }

  async disable(slug: string) {
    await this.toggle(slug, 'disable')
  }

  private async toggle(slug: string, action: 'enable' | 'disable') {
    await this.goto()
    await Promise.all([
      this.page.waitForResponse(`**/admin/queues/${slug}/${action}`),
      // the slider covers the checkbox, as it does for a player
      this.enabledSwitch(slug).locator('..').click(),
    ])
  }

  async delete(slug: string) {
    await this.goto()
    this.page.once('dialog', dialog => dialog.accept())
    await this.row(slug)
      .getByRole('button', { name: `Delete queue ${slug}` })
      .click()
    await expect(this.row(slug)).toHaveCount(0)
  }

  async move(slug: string, direction: 'up' | 'down') {
    await this.goto()
    const before = await this.index(slug)
    await Promise.all([
      this.page.waitForResponse('**/admin/all-queues/order'),
      this.row(slug)
        .getByRole('button', { name: `Move queue ${slug} ${direction}` })
        .click(),
    ])
    await expect.poll(() => this.index(slug)).toBe(before + (direction === 'up' ? -1 : 1))
  }

  async dragAbove(slug: string, target: string) {
    // a drag in Playwright doesn't scroll, so both rows have to be on screen
    const viewport = this.page.viewportSize()
    await this.page.setViewportSize({ width: 1280, height: 2000 })
    try {
      await this.goto()
      await Promise.all([
        this.page.waitForResponse('**/admin/all-queues/order'),
        this.row(slug)
          .locator('[data-drag-handle]')
          .dragTo(this.row(target), { targetPosition: { x: 10, y: 2 } }),
      ])
    } finally {
      if (viewport) {
        await this.page.setViewportSize(viewport)
      }
    }
  }

  async moveToTop(slug: string) {
    await this.goto()
    while ((await this.index(slug)) > 0) {
      await this.move(slug, 'up')
    }
  }

  // position among the queues, 0 being the first
  private async index(slug: string) {
    const names = await this.page
      .getByRole('row', { name: /^Queue / })
      .evaluateAll(rows => rows.map(row => row.getAttribute('aria-label')))
    return names.indexOf(`Queue ${slug}`)
  }

  async isEnabled(slug: string) {
    await this.goto()
    return await this.enabledSwitch(slug).isChecked()
  }

  async expectFlash(message: string | RegExp) {
    await expect(this.page.getByText(message)).toBeVisible()
  }
}
