import fp from 'fastify-plugin'
import { events } from '../../events'
import { safe } from '../../utils/safe'
import { collections } from '../../database/collections'
import { setSkill } from '../set-skill'
import { logger } from '../../logger'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on(
      'player:created',
      safe(async ({ steamId }) => {
        const futureSkill = await collections.futurePlayerSkills.findOneAndDelete({ steamId })
        if (futureSkill) {
          logger.info({ steamId, skill: futureSkill.skill }, 'applying future skill to new player')
          await setSkill({
            steamId,
            skill: futureSkill.skill,
            actor: futureSkill.actor,
          })
        }
      }),
    )
  },
  {
    name: 'apply future skill',
  },
)
