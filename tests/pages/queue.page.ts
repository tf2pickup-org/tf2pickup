import { errors, type Locator, type Page } from '@playwright/test'
import { secondsToMilliseconds } from 'date-fns'

class QueueSlot {
  readonly locator: Locator

  constructor(
    private readonly page: Page,
    private readonly slotNumber: number,
  ) {
    this.locator = this.page.getByLabel(`Queue slot ${this.slotNumber}`, { exact: true })
  }

  joinButton() {
    return this.page.getByLabel(`Join queue on slot ${this.slotNumber}`, { exact: true })
  }

  async join() {
    await this.joinButton().click()
  }

  markAsFriendButton() {
    return this.locator.getByRole('button', { name: 'Mark as friend' })
  }
}

class ReadyUpDialog {
  constructor(private readonly page: Page) {}

  readyUpButton() {
    return this.page.getByRole('button', { name: `I'M READY` })
  }

  async readyUp() {
    const button = this.readyUpButton()
    try {
      await button.click({ timeout: secondsToMilliseconds(5) })
    } catch (error) {
      if (error instanceof errors.TimeoutError) {
        return
      }
    }
  }

  async notReady() {
    await this.page.getByRole('button', { name: `Can't play right now` }).click()
  }
}

export class QueuePage {
  constructor(public readonly page: Page) {}

  async goto() {
    await this.page.goto('/')
  }

  async joinQueue(slot: number) {
    await this.page.getByLabel(`Join queue on slot ${slot}`, { exact: true }).click()
  }

  async leaveQueue(timeout = secondsToMilliseconds(5)) {
    await this.page.getByLabel(`Leave queue`, { exact: true }).click({ timeout })
  }

  slot(slot: number) {
    return new QueueSlot(this.page, slot)
  }

  queueSlot(slot: number) {
    return this.page.getByLabel(`Queue slot ${slot}`, { exact: true })
  }

  markAsFriendButton(slot: number) {
    return this.queueSlot(slot).getByRole('button', { name: 'Mark as friend' })
  }

  unfriendButton(slot: number) {
    return this.queueSlot(slot).getByRole('button', { name: 'Unfriend' })
  }

  voteForMapButton(mapNo: number) {
    return this.page.getByLabel('Vote for map').locator(`nth=${mapNo}`)
  }

  readyUpDialog() {
    return new ReadyUpDialog(this.page)
  }

  goBackToGameLink() {
    return this.page.getByRole('link', { name: 'Go back to the game' })
  }
}
