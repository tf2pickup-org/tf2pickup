import { EmbedBuilder } from 'discord.js'
import type { GameNumber } from '../database/models/game.model'
import { environment } from '../environment'
import { toAdmins } from './to-admins'
import { client } from './client'

export async function notifyGameServerAssignmentFailed(gameNumber: GameNumber, reason: string) {
  if (!client) {
    return
  }

  await toAdmins({
    embeds: [
      new EmbedBuilder()
        .setColor('#dc3545')
        .setAuthor({
          name: 'tf2pickup.org bot',
        })
        .setTitle('Failed to assign game server')
        .setDescription(
          [
            `Game: **[#${gameNumber}](${environment.WEBSITE_URL}/games/${gameNumber})**`,
            `Reason: **${reason}**`,
          ].join('\n'),
        )
        .setFooter({
          text: environment.WEBSITE_NAME,
          iconURL: `${environment.WEBSITE_URL}/favicon.png`,
        })
        .setTimestamp(),
    ],
  })
}
