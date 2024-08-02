import type { Page } from '@playwright/test'
import { secondsToMilliseconds } from 'date-fns'

class ReadyUpDialog {
  constructor(private readonly page: Page) {}

  async readyUp() {
    await this.page.getByRole('button', { name: `I'M READY` }).click()
  }

  async notReady() {
    await this.page.getByRole('button', { name: `Can't play right now` }).click()
  }
}

export class QueuePage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/')
  }

  async joinQueue(slot: number) {
    await this.page.getByLabel(`Join queue on slot ${slot}`, { exact: true }).click()
  }

  async leaveQueue(timeout = secondsToMilliseconds(5)) {
    await this.page.getByLabel(`Leave queue`, { exact: true }).click({ timeout })
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
