import { errors, expect, type Locator, type Page } from '@playwright/test'
import { minutesToMilliseconds, secondsToMilliseconds } from 'date-fns'
import { queueSlots, type SlotId } from '../queue-slots'

class QueueSlot {
  readonly locator: Locator

  constructor(
    private readonly page: Page,
    private readonly slotId: SlotId,
  ) {
    this.locator = this.page.getByLabel(`Queue slot ${this.slotId}`)
  }

  async isTaken() {
    return (await this.locator.getAttribute('data-player')) !== null
  }

  async waitToBeFree(options?: { timeout?: number }) {
    await expect(this.locator).not.toHaveAttribute('data-player', {
      timeout: options?.timeout ?? minutesToMilliseconds(1),
    })
  }

  async isReady() {
    return (await this.locator.locator('.player-info').getAttribute('data-player-ready')) === 'true'
  }

  joinButton() {
    return this.locator.getByRole('button', {
      name: `Join queue on slot ${this.slotId}`,
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

  notReadyButton() {
    return this.page.getByRole('button', { name: `No, I can't play now` })
  }

  async notReady() {
    const button = this.notReadyButton()
    try {
      await button.click({ timeout: secondsToMilliseconds(5) })
    } catch (error) {
      if (error instanceof errors.TimeoutError) {
        return
      }
    }
  }
}

export class QueuePage {
  constructor(public readonly page: Page) {}

  async goto() {
    await this.page.goto('/')
  }

  async joinQueue(slot: SlotId) {
    await this.slot(slot).join()
  }

  async leaveQueue(timeout = secondsToMilliseconds(5)) {
    await this.page.getByRole('button', { name: 'Leave queue' }).click({ timeout })
  }

  header() {
    return this.page.getByRole('heading', { name: /Players: \d+\/\d+/ })
  }

  slot(slot: SlotId) {
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

  async preReadyUp() {
    await expect(this.preReadyUpButton()).not.toHaveAttribute('aria-selected')
    await this.preReadyUpButton().click()
    await expect(this.preReadyUpButton()).toHaveAttribute('aria-selected')
  }

  async waitToBeEmpty(options?: { timeout?: number }) {
    await Promise.all(
      Array.from(queueSlots()).map(async i => {
        await this.slot(i).waitToBeFree(options)
      }),
    )
  }
}
