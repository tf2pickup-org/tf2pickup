import { expect, type Locator, type Page } from '@playwright/test'
import { minutesToMilliseconds } from 'date-fns'

export type Tf2ClassName =
  | 'scout'
  | 'soldier'
  | 'demoman'
  | 'medic'
  | 'pyro'
  | 'heavy'
  | 'engineer'
  | 'sniper'
  | 'spy'

class CaptainClassColumn {
  constructor(
    private readonly page: Page,
    public readonly gameClass: Tf2ClassName,
  ) {}

  locator(): Locator {
    return this.page.locator(`#captain-class-column-${this.gameClass}`)
  }

  joinButton(): Locator {
    return this.locator().getByRole('button', { name: `Join as ${this.gameClass}` })
  }

  leaveButton(): Locator {
    return this.locator().getByRole('button', { name: 'Leave queue' })
  }

  removeButton(): Locator {
    return this.locator().getByRole('button', { name: `Remove ${this.gameClass}` })
  }

  playerCard(playerName: string): Locator {
    return this.locator().locator('.player-info').filter({ hasText: playerName })
  }

  async join() {
    await this.joinButton().click()
    await expect(this.joinButton()).not.toBeVisible()
  }

  async leave() {
    await this.leaveButton().click()
    await expect(this.leaveButton()).not.toBeVisible()
  }

  async removeOfferedClass() {
    const count = await this.locator().locator('.player-info').count()
    await this.removeButton().click()
    await expect(this.locator().locator('.player-info')).not.toHaveCount(count)
  }
}

export class DraftBoard {
  constructor(private readonly page: Page) {}

  locator(): Locator {
    return this.page.locator('#draft-board')
  }

  async waitToBeVisible() {
    await expect(this.locator()).toBeVisible({ timeout: minutesToMilliseconds(1) })
  }

  yourTurnBadge(): Locator {
    return this.locator().locator('.your-turn-badge')
  }

  mapBanHeader(): Locator {
    return this.locator().locator('.map-ban-header')
  }

  async isMyTurn(): Promise<boolean> {
    // During pick phase: "Your turn" badge is shown in the team header
    if (await this.yourTurnBadge().isVisible()) return true
    // During map ban phase: header says "Ban a map" (vs "BLU/RED is banning a map…")
    const header = this.mapBanHeader()
    if (!(await header.isVisible())) return false
    return (await header.textContent())?.includes('Ban a map') ?? false
  }

  firstPickButton(): Locator {
    return this.locator().locator('.pick-button').first()
  }

  poolPlayerCount(): Promise<number> {
    return this.locator().locator('.pool-player').count()
  }

  firstBanButton(): Locator {
    return this.locator().locator('.ban-button').first()
  }

  mapBanPanel(): Locator {
    return this.locator().locator('.map-ban-panel')
  }

  selectedMap(): Locator {
    return this.locator().locator('.selected-map')
  }

  selectedMapName(): Locator {
    return this.locator().locator('.selected-map-name')
  }
}

export class CaptainQueuePage {
  constructor(public readonly page: Page) {}

  async goto() {
    await this.page.goto('/')
  }

  classColumn(gameClass: Tf2ClassName): CaptainClassColumn {
    return new CaptainClassColumn(this.page, gameClass)
  }

  playerCount(): Locator {
    return this.page.locator('#captain-player-count')
  }

  header(): Locator {
    return this.page.getByRole('heading', { name: /Players: \d+/ })
  }

  wantsCaptainToggle(): Locator {
    return this.page.locator('#wants-captain-toggle').getByRole('checkbox')
  }

  wantsCaptainLabel(): Locator {
    return this.page.locator('#wants-captain-toggle')
  }

  draftBoard(): DraftBoard {
    return new DraftBoard(this.page)
  }

  readyUpButton(): Locator {
    return this.page.getByRole('button', { name: "I'M READY" })
  }

  async readyUp() {
    const button = this.readyUpButton()
    try {
      await button.click({ timeout: 5000 })
    } catch {
      // ready-up dialog may have already closed
    }
  }

  async waitToBeEmpty(options?: { timeout?: number }) {
    await expect(this.playerCount()).toHaveText('0', {
      timeout: options?.timeout ?? minutesToMilliseconds(1),
    })
  }
}
