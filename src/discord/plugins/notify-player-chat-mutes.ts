import fp from 'fastify-plugin'
import { events } from '../../events'
import { toAdmins } from '../to-admins'
import { EmbedBuilder, type EmbedAuthorOptions } from 'discord.js'
import { players } from '../../players'
import { isBot } from '../../shared/types/bot'
import { environment } from '../../environment'
import { formatDistanceToNow } from 'date-fns'
import { client } from '../client'
import { safe } from '../../utils/safe'
import { playerAvatarUrl } from '../../shared/player-avatar-url'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    if (!client) {
      return
    }

    events.on(
      'player/chatMute:added',
      safe(async ({ player, chatMute }) => {
        let author: EmbedAuthorOptions
        if (isBot(chatMute.actor)) {
          author = { name: 'tf2pickup.org bot' }
        } else {
          const admin = await players.bySteamId(chatMute.actor, [
            'name',
            'steamId',
            'avatar.medium',
          ])
          author = {
            name: admin.name,
            iconURL: playerAvatarUrl(admin.avatar, 'medium'),
            url: `${environment.WEBSITE_URL}/players/${admin.steamId}`,
          }
        }

        const p = await players.bySteamId(player, ['name', 'steamId', 'avatar.large'])
        await toAdmins({
          embeds: [
            new EmbedBuilder()
              .setColor('#dc3545')
              .setAuthor(author)
              .setTitle('Player chat mute added')
              .setThumbnail(playerAvatarUrl(p.avatar, 'large'))
              .setDescription(
                [
                  `Player: **[${p.name}](${environment.WEBSITE_URL}/players/${p.steamId})**`,
                  `Reason: **${chatMute.reason}**`,
                  `Ends: **${formatDistanceToNow(chatMute.end, { addSuffix: true })}**`,
                ].join('\n'),
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

    events.on(
      'player/chatMute:revoked',
      safe(async ({ player, chatMute, admin }) => {
        let author: EmbedAuthorOptions
        if (isBot(admin)) {
          author = { name: 'tf2pickup.org bot' }
        } else {
          const { name, avatar } = await players.bySteamId(admin, ['name', 'avatar.medium'])
          author = {
            name,
            iconURL: playerAvatarUrl(avatar, 'medium'),
            url: `${environment.WEBSITE_URL}/players/${admin}`,
          }
        }

        const p = await players.bySteamId(player, ['name', 'steamId', 'avatar.large'])
        await toAdmins({
          embeds: [
            new EmbedBuilder()
              .setColor('#9838dc')
              .setAuthor(author)
              .setTitle('Player chat mute revoked')
              .setThumbnail(playerAvatarUrl(p.avatar, 'large'))
              .setDescription(
                [
                  `Player: **[${p.name}](${environment.WEBSITE_URL}/players/${p.steamId})**`,
                  `Reason: **${chatMute.reason}**`,
                ].join('\n'),
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
    name: 'discord - notify on player chat mutes',
  },
)
