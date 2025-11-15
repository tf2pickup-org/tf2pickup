import fp from 'fastify-plugin'
import { events } from '../../events'
import { toAdmins } from '../to-admins'
import { EmbedBuilder } from 'discord.js'
import { players } from '../../players'
import { environment } from '../../environment'
import { client } from '../client'
import { makePlayerChangesNotificationBody } from '../make-player-changes-notification-body'
export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    if (!client) {
      return
    }

    events.on('player:updated', async ({ before, after, adminId }) => {
      const admin = await players.bySteamId(adminId!)
      const changes = makePlayerChangesNotificationBody({ before, after })

      if (changes === '') {
        return
      }

      await toAdmins({
        embeds: [
          new EmbedBuilder()
            .setColor('#5230dc')
            .setAuthor({
              name: admin.name,
              iconURL: admin.avatar.medium,
              url: `${environment.WEBSITE_URL}/players/${admin.steamId}`,
            })
            .setTitle('Player profile updated')
            .setThumbnail(after.avatar.large)
            .setDescription(
              `Player: **[${after.name}](${environment.WEBSITE_URL}/players/${admin.steamId})**\n${changes}`,
            )
            .setFooter({
              text: environment.WEBSITE_NAME,
              iconURL: `${environment.WEBSITE_URL}/favicon.png`,
            })
            .setTimestamp(),
        ],
      })
    })
  },
  {
    name: 'discord - notify on player change',
  },
)
