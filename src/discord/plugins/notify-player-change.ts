import fp from 'fastify-plugin'
import { events } from '../../events'
import { toAdmins } from '../to-admins'
import { EmbedBuilder } from 'discord.js'
import { players } from '../../players'
import { environment } from '../../environment'

interface Change {
  old: string
  new: string
}

function generateChangesText(changes: Record<string, Change>) {
  const changesText = []
  for (const name of Object.keys(changes)) {
    changesText.push(`${name}: **${changes[name]?.old ?? '__not set__'} => ${changes[name]!.new}**`)
  }

  return changesText.join('\n')
}

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on('player:updated', async ({ before, after, adminId }) => {
      if (before.name !== after.name) {
        const admin = await players.bySteamId(adminId!)
        const changes = generateChangesText({
          name: { old: before.name, new: after.name },
        })

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
      }
    })
  },
  {
    name: 'discord - notify on player change',
  },
)
