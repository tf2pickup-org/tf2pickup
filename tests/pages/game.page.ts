import type { Locator, Page } from '@playwright/test'
import type { UserName } from '../user-manager'

export class GameSlot {
  readonly locator: Locator

  constructor(
    private readonly page: Page,
    private readonly playerName: UserName,
  ) {
    this.locator = this.page.getByLabel(`${this.playerName}'s slot`)
  }

  async status() {
    return this.locator.getAttribute('data-status')
  }
}

export class GamePage {
  constructor(
    public readonly page: Page,
    public readonly gameNumber: number,
  ) {}

  url() {
    return `/games/${this.gameNumber}`
  }

  async goto() {
    await this.page.goto(this.url())
  }

  gameStatus() {
    return this.page.getByLabel('Game status')
  }

  async isLive() {
    return (
      (await this.gameStatus().isVisible()) &&
      (await this.gameStatus().textContent())?.toLowerCase() === 'live'
    )
  }

  playerSlot(playerName: UserName) {
    return this.page.getByLabel(`${playerName}'s slot`)
  }

  slot(playerName: UserName) {
    return new GameSlot(this.page, playerName)
  }

  playerLink(playerName: UserName) {
    return this.playerSlot(playerName).getByRole('link', { name: playerName })
  }

  connectString() {
    return this.page.getByLabel('Connect string')
  }

  waitingForGameServer() {
    return this.page.locator('a').filter({ hasText: 'Waiting for server...' })
  }

  joinGameButton() {
    return this.page.getByRole('link', { name: /join (game|in \d{1,2}\:\d{2})/i })
  }

  joinVoiceButton() {
    return this.page.getByRole('link', { name: 'join voice' })
  }

  watchStvButton() {
    return this.page.getByRole('link', { name: 'watch stv' })
  }

  async requestSubstitute(playerName: UserName) {
    const btn = this.playerSlot(playerName).getByLabel('Request substitute')
    await btn.click()
  }

  async replacePlayer(playerName: UserName) {
    const btn = this.playerSlot(playerName).getByRole('button', { name: 'Replace player' })
    await btn.click()
  }

  gameEvent(event: string | RegExp) {
    return this.page.getByLabel('Game events').getByText(event)
  }

  adminActions() {
    return this.page.getByRole('button', { name: 'Admin actions' })
  }

  async forceEnd() {
    this.page.on('dialog', dialog => dialog.accept())
    await this.adminActions().click()
    const btn = this.page.getByRole('button', { name: 'Force-end' })
    await btn.click()
  }
}
