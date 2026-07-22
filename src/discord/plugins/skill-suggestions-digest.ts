import fp from 'fastify-plugin'
import { EmbedBuilder } from 'discord.js'
import { milliseconds } from 'date-fns'
import { client } from '../client'
import { collections } from '../../database/collections'
import { configuration } from '../../configuration'
import { environment } from '../../environment'
import { collectSkillSuggestions } from '../../players/collect-skill-suggestions'
import { tasks } from '../../tasks'
import { toAdmins } from '../to-admins'

const digestInterval = milliseconds({ weeks: 1 })
const maxPlayersListed = 10

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(async app => {
  tasks.register('discord:skillSuggestionsDigest', async () => {
    if (!client) {
      return
    }
    await tasks.schedule('discord:skillSuggestionsDigest', digestInterval)
    await maybeSendDigest()
  })

  app.addHook('onReady', async () => {
    if (!client) {
      return
    }
    const pending = await collections.tasks.findOne({ name: 'discord:skillSuggestionsDigest' })
    if (!pending) {
      await tasks.schedule('discord:skillSuggestionsDigest', digestInterval)
    }
  })
})

async function maybeSendDigest() {
  const [suggestionsEnabled, digestEnabled] = await Promise.all([
    configuration.get('games.skill_suggestions'),
    configuration.get('games.skill_suggestions_digest'),
  ])
  if (!suggestionsEnabled || !digestEnabled) {
    return
  }

  const all = await collectSkillSuggestions()
  if (all.length === 0) {
    return
  }

  const lines = all.slice(0, maxPlayersListed).map(({ player, suggestions }) => {
    const classes = [...suggestions.entries()]
      .map(([gameClass, direction]) => `${gameClass} ${direction === 'up' ? '↑' : '↓'}`)
      .join(', ')
    return `**[${player.name}](${environment.WEBSITE_URL}/players/${player.steamId})** — ${classes}`
  })
  if (all.length > maxPlayersListed) {
    lines.push(`…and ${all.length - maxPlayersListed} more`)
  }

  await toAdmins({
    embeds: [
      new EmbedBuilder()
        .setColor('#f0b132')
        .setAuthor({
          name: 'tf2pickup.org bot',
        })
        .setTitle('Pending skill suggestions')
        .setDescription(
          [
            ...lines,
            '',
            `Review them in the [admin panel](${environment.WEBSITE_URL}/admin/skill-suggestions).`,
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
