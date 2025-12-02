import fp from 'fastify-plugin'
import { events } from '../../events'
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
      'player:updated',
      safe(async ({ before, after }) => {
        if (before.etf2lProfileId === after.etf2lProfileId) {
          return
        }

        const oldId = before.etf2lProfileId
        const newId = after.etf2lProfileId

        const embed = new EmbedBuilder()
          .setColor('#5230dc')
          .setTitle('ETF2L profile updated')
          .setDescription(
            [
              `Player: **[${after.name}](${environment.WEBSITE_URL}/players/${after.steamId})**`,
              `ETF2L profile: ${oldId ?? 'none'} → ${newId ?? 'none'}`,
            ].join('\n'),
          )
          .setFooter({
            text: environment.WEBSITE_NAME,
            iconURL: `${environment.WEBSITE_URL}/favicon.png`,
          })
          .setTimestamp()

        await toAdmins({ embeds: [embed] })
      }),
    )
  },
  {
    name: 'discord - notify on etf2l profile change',
  },
)
