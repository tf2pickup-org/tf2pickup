import fp from 'fastify-plugin'
import { EmbedBuilder } from 'discord.js'
import { client } from '../client'
import { events } from '../../events'
import { environment } from '../../environment'
import { forEachEnabledChannel } from '../for-each-enabled-channel'
import { safe } from '../../utils/safe'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    if (!client) return

    events.on(
      'agent/skillReview:completed',
      safe(async ({ gameNumber, changes, summary }) => {
        const changeLines = changes.map(
          c =>
            `• **${c.playerName}** (${c.gameClass}): ${c.previousSkill} → ${c.newSkill} — ${c.reasoning}`,
        )

        const description = [
          `Game: **[#${gameNumber}](${environment.WEBSITE_URL}/games/${gameNumber})**`,
          '',
          '**Changes applied:**',
          ...changeLines,
          '',
          `*${summary}*`,
        ].join('\n')

        await forEachEnabledChannel('adminNotifications', async channel => {
          await channel.send({
            embeds: [
              new EmbedBuilder()
                .setColor('#5865f2')
                .setAuthor({ name: 'Agent Skill Supervisor' })
                .setTitle(`Skill review — game #${gameNumber}`)
                .setDescription(description)
                .setFooter({
                  text: environment.WEBSITE_NAME,
                  iconURL: `${environment.WEBSITE_URL}/favicon.png`,
                })
                .setTimestamp(),
            ],
          })
        })
      }),
    )
  },
  { name: 'discord - notify on agent skill review' },
)
