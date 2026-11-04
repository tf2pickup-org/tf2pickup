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
      'mumble/certificateConflict',
      safe(async ({ player, owner }) => {
        const [p, o] = await Promise.all([
          players.bySteamId(player, ['name', 'steamId']),
          players.bySteamId(owner, ['name', 'steamId']),
        ])
        await toAdmins({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff953e')
              .setTitle('Mumble certificate linked to another account')
              .setDescription(
                [
                  `**[${p.name}](${environment.WEBSITE_URL}/players/${p.steamId})** tried to verify on Mumble with a certificate that is linked to **[${o.name}](${environment.WEBSITE_URL}/players/${o.steamId})**.`,
                  'This could be a shared computer, or someone using another player’s certificate.',
                ].join('\n\n'),
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
    name: 'discord - notify on mumble certificate conflict',
  },
)
