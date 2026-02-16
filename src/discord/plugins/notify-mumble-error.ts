import fp from 'fastify-plugin'
import { client } from '../client'
import { events } from '../../events'
import { forEachEnabledChannel } from '../for-each-enabled-channel'
import { EmbedBuilder } from 'discord.js'
import { environment } from '../../environment'
import { safe } from '../../utils/safe'

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(async () => {
  if (!client) {
    return
  }

  events.on(
    'mumble/error',
    safe(async ({ error }) => {
      await forEachEnabledChannel('adminNotifications', async channel => {
        await channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor('#dc3545')
              .setAuthor({
                name: 'tf2pickup.org bot',
              })
              .setTitle('Mumble client error')
              .setDescription(error instanceof Error ? error.message : String(error))
              .setFooter({
                text: environment.WEBSITE_NAME,
                iconURL: `${environment.WEBSITE_URL}/favicon.png`,
              })
              .setTimestamp(),
          ],
        })
      })
    }),
  )
})
