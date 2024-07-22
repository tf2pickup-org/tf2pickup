import type { Page } from '@playwright/test'

export class GamePage {
  readonly gameNumber: number

  constructor(public readonly page: Page) {
    const matches = page.url().match(/games\/(\d+)/)
    if (matches) {
      this.gameNumber = Number(matches[1])
    } else {
      throw new Error(`invalid page`)
    }
  }

  playerSlot(playerName: string) {
    return this.page.getByLabel(`${playerName}'s slot`)
  }

  playerLink(playerName: string) {
    return this.playerSlot(playerName).getByRole('link', { name: playerName })
  }

  async requestSubstitute(playerName: string) {
    const btn = this.playerSlot(playerName).getByLabel('Request substitute')
    await btn.click()
  }

  async replacePlayer(playerName: string) {
    const btn = this.playerSlot(playerName).getByRole('button', { name: 'Replace player' })
    await btn.click()
  }

  gameEvent(event: string) {
    return this.page.getByLabel('Game events').getByText(event)
  }
}
