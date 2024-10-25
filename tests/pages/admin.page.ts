import type { Page } from '@playwright/test'

export class AdminPage {
  constructor(public readonly page: Page) {}

  async banPlayer(steamId: string, { reason }: { reason: string }) {
    await this.page.goto(`/players/${steamId}`)
    await this.page.getByRole('link', { name: 'Edit player' }).click()
    await this.page.getByRole('link', { name: 'Bans' }).click()
    await this.page.getByRole('link', { name: 'Add ban' }).click()
    await this.page.getByLabel('Reason').fill(reason)
    await this.page.getByRole('button', { name: 'Save' }).click()
  }

  async revokeAllBans(steamId: string) {
    await this.page.goto(`/players/${steamId}`)
    await this.page.getByRole('link', { name: 'Edit player' }).click()
    await this.page.getByRole('link', { name: 'Bans' }).click()
    await this.page.waitForURL(/\/players\/[^/]+\/edit\/bans$/)

    for (const revokeButton of await this.page.getByRole('button', { name: 'Revoke ban' }).all()) {
      await revokeButton.click()
    }
  }
}
