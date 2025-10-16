import fp from 'fastify-plugin'
import { events } from '../../events'
import { toAdmins } from '../to-admins'
import { EmbedBuilder, type EmbedAuthorOptions } from 'discord.js'
import { players } from '../../players'
import { isBot } from '../../shared/types/bot'
import { environment } from '../../environment'
import { formatDistanceToNow } from 'date-fns'
import { client } from '../client'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    if (!client) {
      return
    }

    events.on('player/ban:added', async ({ player, ban }) => {
      let author: EmbedAuthorOptions
      if (isBot(ban.actor)) {
        author = { name: 'tf2pickup.org bot' }
      } else {
        const admin = await players.bySteamId(ban.actor)
        author = {
          name: admin.name,
          iconURL: admin.avatar.medium,
          url: `${environment.WEBSITE_URL}/players/${admin.steamId}`,
        }
      }

      const p = await players.bySteamId(player)
      await toAdmins({
        embeds: [
          new EmbedBuilder()
            .setColor('#dc3545')
            .setAuthor(author)
            .setTitle('Player ban added')
            .setThumbnail(p.avatar.large)
            .setDescription(
              [
                `Player: **[${p.name}](${environment.WEBSITE_URL}/players/${p.steamId})**`,
                `Reason: **${ban.reason}**`,
                `Ends: **${formatDistanceToNow(ban.end, { addSuffix: true })}**`,
              ].join('\n'),
            )
            .setFooter({
              text: environment.WEBSITE_NAME,
              iconURL: `${environment.WEBSITE_URL}/favicon.png`,
            })
            .setTimestamp(),
        ],
      })
    })

    events.on('player/ban:revoked', async ({ player, ban }) => {
      let author: EmbedAuthorOptions
      if (isBot(ban.actor)) {
        author = { name: 'tf2pickup.org bot' }
      } else {
        const admin = await players.bySteamId(ban.actor)
        author = {
          name: admin.name,
          iconURL: admin.avatar.medium,
          url: `${environment.WEBSITE_URL}/players/${admin.steamId}`,
        }
      }

      const p = await players.bySteamId(player)
      await toAdmins({
        embeds: [
          new EmbedBuilder()
            .setColor('#9838dc')
            .setAuthor(author)
            .setTitle('Player ban revoked')
            .setThumbnail(p.avatar.large)
            .setDescription(
              [
                `Player: **[${p.name}](${environment.WEBSITE_URL}/players/${p.steamId})**`,
                `Reason: **${ban.reason}**`,
              ].join('\n'),
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
    name: 'discord - notify on player bans',
  },
)
