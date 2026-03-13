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
      'queue:cleared',
      safe(async ({ admin, playerCount }) => {
        const { name, avatar, steamId } = await players.bySteamId(admin, [
          'name',
          'avatar.medium',
          'steamId',
        ])

        await toAdmins({
          embeds: [
            new EmbedBuilder()
              .setColor('#fd7e14')
              .setAuthor({
                name,
                iconURL: avatar.medium,
                url: `${environment.WEBSITE_URL}/players/${steamId}`,
              })
              .setTitle('Queue cleared')
              .setDescription(`Players kicked: **${playerCount}**`)
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
    name: 'discord - notify on queue cleared',
  },
)
