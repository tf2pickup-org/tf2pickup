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
        const futureSkills = await collections.futurePlayerSkills.find({ steamId }).toArray()
        for (const { gamemode, skill, actor } of futureSkills) {
          logger.info({ steamId, gamemode, skill }, 'applying future skill to new player')
          await setSkill({ steamId, gamemode, skill, actor })
        }
        await collections.futurePlayerSkills.deleteMany({ steamId })
      }),
    )
  },
  {
    name: 'apply future skill',
  },
)
