import fp from 'fastify-plugin'
import { events } from '../../events'
import { toAdmins } from '../to-admins'
import { EmbedBuilder } from 'discord.js'
import { players } from '../../players'
import { environment } from '../../environment'
import { client } from '../client'
import { safe } from '../../utils/safe'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    if (!client) {
      return
    }

    events.on(
      'player:updated',
      safe(async ({ before, after, adminId }) => {
        if (!adminId) {
          return
        }

        if (before.verified === after.verified) {
          return
        }

        const isVerified = after.verified === true
        const admin = await players.bySteamId(adminId, ['name', 'steamId', 'avatar.medium'])
        await toAdmins({
          embeds: [
            new EmbedBuilder()
              .setColor(isVerified ? '#33dc7f' : '#ff953e')
              .setAuthor({
                name: admin.name,
                iconURL: admin.avatar.medium,
                url: `${environment.WEBSITE_URL}/players/${admin.steamId}`,
              })
              .setTitle(isVerified ? 'Player verified' : 'Player verification revoked')
              .setThumbnail(after.avatar.large)
              .setDescription(
                `Player: **[${after.name}](${environment.WEBSITE_URL}/players/${after.steamId})**`,
              )
              .setFooter({
                text: environment.WEBSITE_NAME,
                iconURL: `${environment.WEBSITE_URL}/favicon.png`,
              })
              .setTimestamp(),
          ],
        })
      }),
    )
  },
  {
    name: 'discord - notify on player verification change',
  },
)
