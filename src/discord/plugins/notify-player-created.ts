import fp from 'fastify-plugin'
import { events } from '../../events'
import { players } from '../../players'
import { toAdmins } from '../to-admins'
import { EmbedBuilder } from 'discord.js'
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
      'player:created',
      safe(async ({ steamId }) => {
        const player = await players.bySteamId(steamId)
        await toAdmins({
          embeds: [
            new EmbedBuilder()
              .setColor('#33dc7f')
              .setTitle('New player')
              .addFields({
                name: 'Name',
                value: player.name,
              })
              .setThumbnail(player.avatar.large)
              .setURL(`${environment.WEBSITE_URL}/players/${player.steamId}`)
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
    name: 'discord - notify when player is created',
  },
)
