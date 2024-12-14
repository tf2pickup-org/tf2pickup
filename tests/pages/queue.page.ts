import { errors, expect, type Locator, type Page } from '@playwright/test'
import { minutesToMilliseconds, secondsToMilliseconds } from 'date-fns'

class QueueSlot {
  readonly locator: Locator

  constructor(
    private readonly page: Page,
    private readonly slotNumber: number,
  ) {
    this.locator = this.page.getByLabel(`Queue slot ${this.slotNumber}`, { exact: true })
  }

  async isTaken() {
    return (await this.locator.getAttribute('data-player')) !== null
  }

  async waitToBeFree(options?: { timeout?: number }) {
    await expect(this.locator).not.toHaveAttribute('data-player', {
      timeout: options?.timeout ?? minutesToMilliseconds(1),
    })
  }

  joinButton() {
    return this.locator.getByRole('button', {
      name: `Join queue on slot ${this.slotNumber}`,
      exact: true,
    })
  }

  async join() {
    await this.joinButton().click()
    await expect(this.joinButton()).not.toBeVisible()
  }

  markAsFriendButton() {
    return this.locator.getByLabel('Mark as friend')
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
    await this.page.getByRole('button', { name: `No, I can't play now` }).click()
  }
}

export class QueuePage {
  constructor(public readonly page: Page) {}

  async goto() {
    await this.page.goto('/')
  }

  async joinQueue(slot: number) {
    await this.slot(slot).join()
  }

  async leaveQueue(timeout = secondsToMilliseconds(5)) {
    await this.page.getByRole('button', { name: 'Leave queue' }).click({ timeout })
  }

  header() {
    return this.page.getByRole('heading', { name: /Players: \d+\/\d+/ })
  }

  slot(slot: number) {
    return new QueueSlot(this.page, slot)
  }

  queueSlot(slot: number) {
    return this.page.getByLabel(`Queue slot ${slot}`, { exact: true })
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

  preReadyUpButton() {
    return this.page.getByRole('button', { name: 'Pre-ready up' })
  }

  async waitToBeEmpty(options?: { timeout?: number }) {
    await Promise.all(
      Array.from(Array(12).keys()).map(async i => await this.slot(i).waitToBeFree(options)),
    )
  }
}
