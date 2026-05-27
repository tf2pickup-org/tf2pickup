import fp from 'fastify-plugin'
import Anthropic from '@anthropic-ai/sdk'
import { minutesToMilliseconds } from 'date-fns'
import { events } from '../../events'
import { GameState } from '../../database/models/game.model'
import { environment } from '../../environment'
import { configuration } from '../../configuration'
import { players } from '../../players'
import { safe } from '../../utils/safe'
import { tasks } from '../../tasks'
import { collections } from '../../database/collections'
import { reviewGameSkills } from '../../agent/review-game-skills'
import { logger } from '../../logger'
import type { GameNumber } from '../../database/models/game.model'

// Allow 3 minutes for logs.tf to upload and fetch parsed data before reviewing
const REVIEW_DELAY = minutesToMilliseconds(3)

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    if (!environment.ANTHROPIC_API_KEY) return

    events.on(
      'game:ended',
      safe(async ({ game }) => {
        if (game.state !== GameState.ended) return
        if (!(await configuration.get('agent.skill_supervisor'))) return
        await tasks.schedule('agentSkillSupervisor:review', REVIEW_DELAY, {
          gameNumber: game.number,
        })
      }),
    )
  },
)

tasks.register(
  'agentSkillSupervisor:review',
  async ({ gameNumber }: { gameNumber: GameNumber }) => {
    if (!(await configuration.get('agent.skill_supervisor'))) return

    logger.info({ gameNumber }, 'agent skill supervisor: reviewing game')

    const [game, skillStep] = await Promise.all([
      collections.games.findOne({ number: gameNumber }),
      configuration.get('games.skill_step'),
    ])
    if (!game) return

    const steamIds = [...new Set(game.slots.map(s => s.player))]
    const playerList = await collections.players.find({ steamId: { $in: steamIds } }).toArray()

    const logData = (await collections.logsTfLogs.findOne({ gameNumber })) ?? undefined

    const anthropic = new Anthropic({ apiKey: environment.ANTHROPIC_API_KEY! })
    const review = await reviewGameSkills(anthropic, game, playerList, skillStep, logData)

    if (!review) {
      logger.warn({ gameNumber }, 'agent skill supervisor: no review returned')
      return
    }

    if (review.changes.length === 0) {
      logger.info({ gameNumber, summary: review.summary }, 'agent skill supervisor: no changes')
      return
    }

    for (const change of review.changes) {
      const player = playerList.find(p => p.steamId === change.steamId)
      if (!player) continue

      const newSkill = { ...player.skill, [change.gameClass]: change.newSkill }

      await players.update(change.steamId, {
        $set: { skill: newSkill },
        $push: {
          skillHistory: {
            at: new Date(),
            skill: newSkill,
            actor: 'bot',
            lastGame: gameNumber,
          },
        },
      })

      logger.info(
        {
          gameNumber,
          steamId: change.steamId,
          gameClass: change.gameClass,
          newSkill: change.newSkill,
        },
        'agent skill supervisor: skill updated',
      )
    }

    events.emit('agent/skillReview:completed', {
      gameNumber,
      changes: review.changes,
      summary: review.summary,
    })
  },
)
