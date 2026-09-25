import { expect, type Page } from '@playwright/test'
import { secondsToMilliseconds } from 'date-fns'
import { defaultQueueSlug } from '../queue-slots'

export class AdminPage {
  constructor(public readonly page: Page) {}

  private async openToolbox() {
    const content = this.page.locator('#player-admin-toolbox .player-admin-toolbox')
    if (!(await content.isVisible())) {
      await this.page.locator('#player-admin-toolbox summary').click()
    }
  }

  async banPlayer(steamId: string, { reason, anonymous }: { reason: string; anonymous?: boolean }) {
    await this.page.goto(`/players/${steamId}`)
    await this.openToolbox()
    await this.page.getByRole('link', { name: 'Edit player' }).click()
    await this.page.getByRole('link', { name: 'Bans' }).click()
    await this.page.getByRole('link', { name: 'Add ban' }).click()
    await this.page.getByLabel('Reason').fill(reason)
    if (anonymous) {
      await this.page.getByLabel('Anonymous').check()
    }
    await this.page.getByRole('button', { name: 'Save' }).click()
  }

  async revokeAllBans(steamId: string) {
    await this.page.goto(`/players/${steamId}`)
    await this.openToolbox()
    await this.page.getByRole('link', { name: 'Edit player' }).click()
    await this.page.getByRole('link', { name: 'Bans' }).click()
    await this.page.waitForURL(/\/players\/[^/]+\/edit\/bans$/)

    for (const revokeButton of await this.page.getByRole('button', { name: 'Revoke ban' }).all()) {
      await revokeButton.click()
    }
  }

  async muteChatPlayer(steamId: string, { reason }: { reason: string }) {
    await this.page.goto(`/players/${steamId}`)
    await this.openToolbox()
    await this.page.getByRole('link', { name: 'Edit player' }).click()
    await this.page.getByRole('link', { name: 'Chat mutes' }).click()
    await this.page.getByRole('link', { name: 'Add mute' }).click()
    await this.page.getByLabel('Reason').fill(reason)
    await this.page.getByRole('button', { name: 'Save' }).click()
  }

  async revokeAllChatMutes(steamId: string) {
    await this.page.goto(`/players/${steamId}`)
    await this.openToolbox()
    await this.page.getByRole('link', { name: 'Edit player' }).click()
    await this.page.getByRole('link', { name: 'Chat mutes' }).click()
    await this.page.waitForURL(/\/players\/[^/]+\/edit\/chat-mutes$/)

    for (const revokeButton of await this.page.getByRole('button', { name: 'Revoke mute' }).all()) {
      await revokeButton.click()
    }
  }

  async updateSkill(
    steamId: string,
    skill: { scout: number; soldier: number; demoman: number; medic: number },
  ) {
    await this.page.goto(`/players/${steamId}`)
    await this.openToolbox()
    await this.page.getByLabel("Player's skill on scout").fill(skill.scout.toString())
    await this.page.getByLabel("Player's skill on soldier").fill(skill.soldier.toString())
    await this.page.getByLabel("Player's skill on demoman").fill(skill.demoman.toString())
    await this.page.getByLabel("Player's skill on medic").fill(skill.medic.toString())
    await this.page.getByRole('button', { name: 'Save' }).click()
    await this.page.waitForURL(`/players/${steamId}`)
  }

  async playerCooldown(steamId: string) {
    await this.page.goto(`/players/${steamId}`)
    await this.openToolbox()
    await this.page.getByRole('link', { name: 'Edit player' }).click()
    return this.page.getByLabel('Cooldown level')
  }

  async setPlayerCooldown(steamId: string, cooldown: number) {
    await (await this.playerCooldown(steamId)).fill(cooldown.toString())
    await this.page.getByRole('button', { name: 'Save' }).click()
    await this.page.waitForURL(`/players/${steamId}`)
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

  async configureHideServerInfo(mode: 'never' | 'auto' | 'always') {
    await this.page.goto('/admin/game-servers')
    await Promise.all([
      this.page.waitForResponse(
        resp =>
          resp.url().includes('/admin/game-servers/hide-server-info') && resp.status() === 200,
      ),
      this.page.getByLabel('Hide server info from spectators').selectOption(mode),
    ])
  }

  async configurePlayerSkillThreshold(threshold: number | null, queue = defaultQueueSlug()) {
    await this.page.goto(`/admin/queues/${queue}`)
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

  async configureRequirePlayerVerification(enabled: boolean, queue = defaultQueueSlug()) {
    await this.page.goto(`/admin/queues/${queue}`)
    // the checkbox is hidden behind the switch
    const checkbox = this.page.getByLabel('Require player verification')
    if ((await checkbox.isChecked()) !== enabled) {
      await this.page.locator('label.switch', { has: checkbox }).click()
    }
    await expect(checkbox).toBeChecked({ checked: enabled })
    await this.page.getByRole('button', { name: 'Save' }).click()
    await expect(this.page.getByText('Configuration saved')).toBeVisible()
  }

  async setPlayerVerified(steamId: string, verified: boolean) {
    await this.page.goto(`/players/${steamId}`)
    await this.openToolbox()
    const checkbox = this.page.getByLabel('Player verified')
    if (!(await checkbox.isVisible())) {
      return
    }
    if ((await checkbox.isChecked()) === verified) {
      return // already in the desired state; no change event will fire
    }
    await Promise.all([
      this.page.waitForResponse(
        resp => resp.url().includes(`/players/${steamId}/verify`) && resp.status() === 200,
      ),
      checkbox.setChecked(verified),
    ])
  }

  async configureVoiceServer(props: { host: string; password: string; channelName: string }) {
    await this.page.goto('/admin/voice-server')
    await this.page.getByLabel('Mumble').click()
    await this.page.getByLabel('Server URL', { exact: true }).fill(props.host)
    await this.page.getByLabel('Server password').fill(props.password)
    await this.page.getByLabel('Channel name').fill(props.channelName)
    await this.page.getByRole('button', { name: 'Save' }).click()
    await expect(this.page.getByText('connected', { exact: true })).toBeVisible()
  }

  async configureWhitelistId(whitelistId: string) {
    await this.page.goto('/admin/games')
    await this.page.getByLabel('Whitelist ID', { exact: true }).fill(whitelistId)
    await this.page.getByRole('button', { name: 'Save' }).click()
    await expect(this.page.getByText('Configuration saved')).toBeVisible()
  }

  async configureDefaultSkill(gamemode: string, gameClass: string, skill: number) {
    await this.page.goto('/admin/player-restrictions')
    await this.page.getByLabel(`Default ${gamemode} skill on ${gameClass}`).fill(skill.toString())
    await this.page.getByRole('button', { name: 'Save' }).click()
    await expect(this.page.getByText('Configuration saved')).toBeVisible()
  }

  async configureGamemodeWhitelistId(gamemode: string, whitelistId: string) {
    await this.page.goto('/admin/games')
    await this.page.getByLabel(`${gamemode} whitelist ID`).fill(whitelistId)
    await this.page.getByRole('button', { name: 'Save' }).click()
    await expect(this.page.getByText('Configuration saved')).toBeVisible()
  }

  async configureQueueWhitelistId(whitelistId: string, queue = defaultQueueSlug()) {
    await this.page.goto(`/admin/queues/${queue}`)
    await this.page.getByLabel('Whitelist ID', { exact: true }).fill(whitelistId)
    await this.page.getByRole('button', { name: 'Save' }).click()
    await expect(this.page.getByText('Configuration saved')).toBeVisible()
  }

  async mapPool(queue = defaultQueueSlug()): Promise<{ name: string; execConfig: string }[]> {
    await this.page.goto(`/admin/map-pool?queue=${queue}`)
    const names = await this.page.getByLabel('Map name').all()
    const configs = await this.page.getByLabel('Map config').all()
    return await Promise.all(
      names.map(async (name, i) => ({
        name: await name.inputValue(),
        execConfig: await configs[i]!.inputValue(),
      })),
    )
  }

  async setMapPool(maps: { name: string; execConfig: string }[], queue = defaultQueueSlug()) {
    await this.page.goto(`/admin/map-pool?queue=${queue}`)
    const removeButtons = this.page.getByRole('button', { name: 'Remove map' })
    while ((await removeButtons.count()) > 0) {
      await removeButtons.first().click()
    }
    for (const [i, { name, execConfig }] of maps.entries()) {
      await this.page.getByRole('button', { name: 'Add map' }).click()
      await this.page.getByLabel('Map name').nth(i).fill(name)
      await this.page.getByLabel('Map config').nth(i).fill(execConfig)
    }
    await this.page.getByRole('button', { name: 'Save' }).click()
    await expect(this.page.getByText('Configuration saved')).toBeVisible()
  }

  async configureGames(config: {
    joinGameServerTimeout?: number
    rejoinGameServerTimeout?: number
  }) {
    await this.page.goto('/admin/games')

    if (config.joinGameServerTimeout) {
      await this.page
        .getByLabel('Join gameserver timeout', { exact: true })
        .fill(config.joinGameServerTimeout.toString())
    }

    if (config.rejoinGameServerTimeout) {
      await this.page
        .getByLabel('Rejoin gameserver timeout')
        .fill(config.rejoinGameServerTimeout.toString())
    }

    await this.page.getByRole('button', { name: 'Save' }).click()
    await expect(this.page.getByText('Configuration saved')).toBeVisible()
  }
}
