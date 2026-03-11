import fp from 'fastify-plugin'
import { EmbedBuilder } from 'discord.js'
import { client } from '../client'
import { events } from '../../events'
import { forEachEnabledChannel } from '../for-each-enabled-channel'
import { environment } from '../../environment'
import { safe } from '../../utils/safe'
import type { StaticGameServerModel } from '../../database/models/static-game-server.model'

type ServerStatus = 'online' | 'offline'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    if (!client) {
      return
    }

    events.on(
      'staticGameServer:added',
      safe(async ({ gameServer }) => {
        if (!gameServer.isOnline) {
          return
        }

        await notifyStatus(gameServer, 'online')
      }),
    )

    events.on(
      'staticGameServer:updated',
      safe(async ({ before, after }) => {
        if (before.isOnline === after.isOnline) {
          return
        }

        await notifyStatus(after, after.isOnline ? 'online' : 'offline')
      }),
    )
  },
  {
    name: 'discord - notify on static game server status',
  },
)

async function notifyStatus(server: StaticGameServerModel, status: ServerStatus) {
  const color = status === 'online' ? '#33dc7f' : '#dc3545'
  const title = status === 'online' ? 'Game server online' : 'Game server offline'

  const lines = [
    `Name: **${server.name}**`,
    `Address: **${server.address}:${server.port}**`,
    `Internal: **${server.internalIpAddress}:${server.port}**`,
  ]

  await forEachEnabledChannel('adminNotifications', async channel => {
    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(color)
          .setAuthor({
            name: 'tf2pickup.org bot',
          })
          .setTitle(title)
          .setDescription(lines.join('\n'))
          .setFooter({
            text: environment.WEBSITE_NAME,
            iconURL: `${environment.WEBSITE_URL}/favicon.png`,
          })
          .setTimestamp(),
      ],
    })
  })
}
