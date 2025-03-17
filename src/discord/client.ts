import { Client, IntentsBitField } from 'discord.js'
import { environment } from '../environment'
import { logger } from '../logger'

export const client = await initializeClient()

async function initializeClient(): Promise<Client | null> {
  if (!environment.DISCORD_BOT_TOKEN) {
    return null
  }

  const client = new Client({
    intents: [
      IntentsBitField.Flags.Guilds,
      IntentsBitField.Flags.GuildExpressions,
      IntentsBitField.Flags.GuildMessages,
    ],
  })
  const ready = new Promise<void>(resolve => {
    client.on('ready', () => {
      if (client.user) {
        logger.info(`logged in as ${client.user.tag}`)
      }
      resolve()
    })
  })

  await client.login(environment.DISCORD_BOT_TOKEN)
  await ready
  return client
}
