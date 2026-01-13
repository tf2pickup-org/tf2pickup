import fp from 'fastify-plugin'
import { events } from '../../../events'
import { collections } from '../../../database/collections'
import { players } from '../../../players'
import { logger } from '../../../logger'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on('player:created', async ({ steamId }) => {
      const pendingSkill = await collections.pendingSkills.findOne({ steamId })
      if (pendingSkill) {
        logger.info({ steamId }, 'applying pending skill to newly registered player')
        await players.setSkill({
          steamId,
          skill: pendingSkill.skill,
          actor: pendingSkill.importedBy,
        })
        await collections.pendingSkills.deleteOne({ steamId })
      }
    })
  },
  { name: 'apply pending skills on player registration' },
)
