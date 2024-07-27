import type { Page } from '@playwright/test'

export class QueuePage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/')
  }

  goBackToGameLink() {
    return this.page.getByRole('link', { name: 'Go back to the game' })
  }
}
