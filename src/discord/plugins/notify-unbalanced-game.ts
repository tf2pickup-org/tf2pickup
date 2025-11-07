import fp from 'fastify-plugin'
import { client } from '../client'
import type { GameModel } from '../../database/models/game.model'
import { events } from '../../events'
import { logger } from '../../logger'
import { forEachEnabledChannel } from '../for-each-enabled-channel'
import { EmbedBuilder } from 'discord.js'
import { environment } from '../../environment'

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(async () => {
  if (!client) {
    return
  }

  events.on('game:ended', ({ game }) => maybeNotify(game))
})

async function maybeNotify(game: GameModel) {
  logger.trace({ game }, 'discord.notifyUnbalancedGame.maybeNotify()')

  if (!game.score) {
    return
  }

  const gameMode = game.map.startsWith('cp') ? 'cp' : game.map.startsWith('koth') ? 'koth' : null
  if (gameMode === null) {
    return
  }

  const scoreDiff = Math.abs(game.score.blu - game.score.red)
  if (gameMode === 'cp' && scoreDiff < 5) {
    return
  }

  if (gameMode === 'koth' && scoreDiff < 3) {
    return
  }

  logger.info({ game }, 'unbalanced game detected')
  await forEachEnabledChannel('adminNotifications', async channel => {
    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('#dc3545')
          .setAuthor({
            name: 'tf2pickup.org bot',
          })
          .setTitle('Unbalanced game detected')
          .setDescription(
            [
              `Game: **[${game.number}](${environment.WEBSITE_URL}/games/${game.number})**`,
              `BLU: **${game.score!.blu}**`,
              `RED: **${game.score!.red}**`,
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
}
