import { expect, type Page } from '@playwright/test'

export class AdminQueuesPage {
  constructor(public readonly page: Page) {}

  async goto() {
    await this.page.goto('/admin/queues')
  }

  row(slug: string) {
    return this.page.getByRole('row', { name: `Queue ${slug}` })
  }

  async create(props: {
    slug: string
    name: string
    template?: string | undefined
    gamemode?: string | undefined
  }) {
    await this.goto()
    await this.page.getByLabel('Start from').selectOption(props.template ?? '')
    await this.page.getByLabel('Slug').fill(props.slug)
    await this.page.getByLabel('Name', { exact: true }).fill(props.name)
    if (props.gamemode) {
      await this.page.getByLabel('Gamemode (blank queues only)').selectOption(props.gamemode)
    }
    await this.page.getByRole('button', { name: 'Add queue' }).click()
  }

  async enable(slug: string) {
    await this.goto()
    await this.row(slug).getByRole('button', { name: 'Enable' }).click()
  }

  async disable(slug: string) {
    await this.goto()
    await this.row(slug).getByRole('button', { name: 'Disable' }).click()
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
    await this.row(slug)
      .getByRole('button', { name: `Move queue ${slug} ${direction}` })
      .click()
    await expect.poll(() => this.index(slug)).toBe(before + (direction === 'up' ? -1 : 1))
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
    return await this.row(slug).getByRole('button', { name: 'Disable' }).isVisible()
  }

  async expectFlash(message: string | RegExp) {
    await expect(this.page.getByText(message)).toBeVisible()
  }
}
