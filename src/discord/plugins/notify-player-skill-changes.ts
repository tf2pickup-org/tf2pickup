import fp from 'fastify-plugin'
import { events } from '../../events'
import { isEqual } from 'es-toolkit'
import { players } from '../../players'
import type { PlayerModel } from '../../database/models/player.model'
import type { Tf2ClassName } from '../../shared/types/tf2-class-name'
import { toAdmins } from '../to-admins'
import { EmbedBuilder } from 'discord.js'
import { environment } from '../../environment'
import { client } from '../client'
import { safe } from '../../utils/safe'

function generateChangesText(
  oldSkill: PlayerModel['skill'],
  newSkill: PlayerModel['skill'],
): string {
  return Object.keys(oldSkill ?? ({} as Record<Tf2ClassName, number>))
    .filter(
      gameClass => newSkill?.[gameClass as Tf2ClassName] !== oldSkill?.[gameClass as Tf2ClassName],
    )
    .map(
      gameClass =>
        `${gameClass}: ${oldSkill?.[gameClass as Tf2ClassName] ?? 'not set'} => **${newSkill?.[gameClass as Tf2ClassName]}**`,
    )
    .join('\n')
}

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    if (!client) {
      return
    }

    events.on(
      'player:updated',
      safe(async ({ before, after, adminId }) => {
        if (!isEqual(before.skill, after.skill)) {
          const admin = await players.bySteamId(adminId!, ['name', 'steamId', 'avatar.medium'])
          const changes = generateChangesText(before.skill, after.skill)

          await toAdmins({
            embeds: [
              new EmbedBuilder()
                .setColor('#ff953e')
                .setAuthor({
                  name: admin.name,
                  iconURL: admin.avatar.medium,
                  url: `${environment.WEBSITE_URL}/players/${admin.steamId}`,
                })
                .setTitle('Player skill updated')
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
      }),
    )
  },
  {
    name: 'discord - notify on player skill change',
  },
)
