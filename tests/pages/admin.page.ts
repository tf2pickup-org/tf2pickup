import { expect, type Page } from '@playwright/test'
import { secondsToMilliseconds } from 'date-fns'

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

  async updateSkill(
    steamId: string,
    skill: { scout: number; soldier: number; demoman: number; medic: number },
  ) {
    await this.page.goto(`/players/${steamId}`)
    await this.page.getByRole('link', { name: 'Edit player' }).click()
    await this.page.getByLabel("Player's skill on scout").fill(skill.scout.toString())
    await this.page.getByLabel("Player's skill on soldier").fill(skill.soldier.toString())
    await this.page.getByLabel("Player's skill on demoman").fill(skill.demoman.toString())
    await this.page.getByLabel("Player's skill on medic").fill(skill.medic.toString())
    await this.page.getByRole('button', { name: 'Save' }).click()
    await this.page.waitForURL(/\/players\/[^/]+$/)
  }

  async freeStaticGameServer() {
    await this.page.goto('/admin/game-servers')
    try {
      await this.page
        .getByRole('button', { name: 'Remove game assignment' })
        .click({ timeout: secondsToMilliseconds(1) })
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      // empty
    }
  }

  async configurePlayerSkillThreshold(threshold: number | null) {
    await this.page.goto('/admin/player-restrictions')
    await this.page
      .getByLabel('Player skill threshold', { exact: true })
      .setChecked(threshold !== null)
    if (threshold !== null) {
      await this.page
        .getByLabel('Player skill threshold value', { exact: true })
        .fill(threshold.toString())
    }

    await this.page.getByRole('button', { name: 'Save' }).click()
    await expect(this.page.getByText('Configuration saved')).toBeVisible()
  }

  async configureVoiceServer(props: { host: string; password: string; channelName: string }) {
    await this.page.goto('/admin/voice-server')
    await this.page.getByLabel('Mumble').click()
    await this.page.getByLabel('Server URL').fill(props.host)
    await this.page.getByLabel('Server password').fill(props.password)
    await this.page.getByLabel('Channel name').fill(props.channelName)
    await this.page.getByRole('button', { name: 'Save' }).click()
    await expect(this.page.getByText('connected', { exact: true })).toBeVisible()
  }
}
