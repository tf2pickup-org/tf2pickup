import { expect, type Locator, type Page } from '@playwright/test'

export interface MapPoolFormEntry {
  name: string
  execConfig: string
}

export class AdminPanelMapPoolPage {
  constructor(private readonly page: Page) {}

  private get heading() {
    return this.page.getByRole('heading', { name: 'Map pool' })
  }

  private get mapRows() {
    return this.page.locator('#mapPoolList tr')
  }

  private get addMapButton() {
    return this.page.getByRole('button', { name: 'Add map' })
  }

  private get saveButton() {
    return this.page.getByRole('button', { name: 'Save' })
  }

  async goto() {
    await this.page.goto('/admin/map-pool')
    await this.waitForReady()
  }

  async waitForReady() {
    await this.page.waitForLoadState('domcontentloaded')
    await expect(this.heading).toBeVisible()
  }

  async reload() {
    await this.page.reload()
    await this.waitForReady()
  }

  async entries(): Promise<MapPoolFormEntry[]> {
    return await this.mapRows.evaluateAll(rows =>
      rows.map(row => {
        const name = (row.querySelector<HTMLInputElement>('input[name="name[]"]')?.value ?? '').trim()
        const execConfig = (
          row.querySelector<HTMLInputElement>('input[name="execConfig[]"]')?.value ?? ''
        ).trim()
        return { name, execConfig }
      }),
    )
  }

  async updateEntry(rowIndex: number, entry: MapPoolFormEntry) {
    await this.fillRow(this.mapRows.nth(rowIndex), entry)
  }

  async addEntry(entry: MapPoolFormEntry) {
    const initialCount = await this.mapRows.count()
    await this.addMapButton.click()
    await expect(this.mapRows).toHaveCount(initialCount + 1)
    const newRow = this.mapRows.nth(initialCount)
    await expect(newRow.locator('input[name="name[]"]')).toHaveValue('')
    await expect(newRow.locator('input[name="execConfig[]"]')).toHaveValue('')
    await this.fillRow(newRow, entry)
  }

  async removeEntry(rowIndex: number) {
    const currentCount = await this.mapRows.count()
    await this.mapRows.nth(rowIndex).locator('button').click()
    await expect(this.mapRows).toHaveCount(currentCount - 1)
  }

  async expectEntryCount(count: number) {
    await expect(this.mapRows).toHaveCount(count)
  }

  async save() {
    await this.saveButton.click()
    await expect(this.page.getByText('Configuration saved')).toBeVisible()
  }

  async expectContains(entry: MapPoolFormEntry) {
    const entries = await this.entries()
    expect(entries).toContainEqual(entry)
  }

  async expectMissing(entryName: string) {
    const entries = await this.entries()
    expect(entries.map(entry => entry.name)).not.toContain(entryName)
  }

  async ensureRestored(entries: MapPoolFormEntry[], testFailed: boolean) {
    try {
      await this.restore(entries)
    } catch (error) {
      if (!testFailed) {
        throw error
      }
      console.error('Failed to restore original map pool after test failure', error)
    }
  }

  private async restore(entries: MapPoolFormEntry[]) {
    await this.goto()
    await this.syncRowCount(entries.length)
    for (let i = 0; i < entries.length; ++i) {
      await this.fillRow(this.mapRows.nth(i), entries[i]!)
    }
    await this.save()
    await this.expectEntryCount(entries.length)
  }

  private async syncRowCount(desiredCount: number) {
    let currentCount = await this.mapRows.count()
    while (currentCount > desiredCount) {
      await this.mapRows.nth(currentCount - 1).locator('button').click()
      currentCount -= 1
      await expect(this.mapRows).toHaveCount(currentCount)
    }

    while (currentCount < desiredCount) {
      await this.addMapButton.click()
      currentCount += 1
      await expect(this.mapRows).toHaveCount(currentCount)
    }
  }

  private async fillRow(row: Locator, entry: MapPoolFormEntry) {
    await row.locator('input[name="name[]"]').fill(entry.name)
    await row.locator('input[name="execConfig[]"]').fill(entry.execConfig)
  }
}
