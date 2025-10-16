import fp from 'fastify-plugin'
import { events } from '../../events'
import { configuration } from '../../configuration'
import { client } from '../client'
import { Guild } from 'discord.js'
import { emojisToInstall } from '../emojis-to-install'
import { logger } from '../../logger'
import { assertClient } from '../assert-client'

async function installEmojis(guild: Guild) {
  for (const emoji of emojisToInstall) {
    const found = guild.emojis.cache.find(e => e.name === emoji.name)
    if (found) {
      continue
    }

    try {
      await guild.emojis.create({
        attachment: emoji.sourceUrl,
        name: emoji.name,
        reason: 'required by the tf2pickup.org server',
      })
      logger.info(`installed emoji ${emoji.name} on guild ${guild.name}`)
    } catch (error) {
      logger.error({ error }, `failed to install emoji ${emoji.name} on guild ${guild.name}`)
    }
  }
}

async function installEmojisOnAllGuilds() {
  assertClient(client)
  const config = await configuration.get('discord.guilds')
  for (const guildConfig of config) {
    const guild = client.guilds.resolve(guildConfig.id)
    if (!guild) {
      logger.warn(`guild ${guildConfig.id} not found`)
      continue
    }
    await installEmojis(guild)
  }
}

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(async () => {
  if (!client) {
    return
  }

  events.on('configuration:updated', async ({ key }) => {
    if (key !== 'discord.guilds') {
      return
    }

    await installEmojisOnAllGuilds()
  })
})
