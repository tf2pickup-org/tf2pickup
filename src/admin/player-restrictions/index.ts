import { PlayerRestrictionsPage } from './views/html/player-restrictions.page'
import { z } from 'zod'
import { configuration } from '../../configuration'
import { standardAdminPage } from '../standard-admin-page'

const playerSkillThresholdSchema = z.discriminatedUnion('playerSkillThresholdEnabled', [
  z.object({
    playerSkillThresholdEnabled: z.literal(false).optional(),
  }),
  z.object({
    playerSkillThresholdEnabled: z.literal('enabled'),
    playerSkillThreshold: z.coerce.number(),
  }),
])

export default standardAdminPage({
  path: '/admin/player-restrictions',
  bodySchema: z.intersection(
    playerSkillThresholdSchema,
    z.object({
      etf2lAccountRequired: z.coerce.boolean().default(false),
      minimumInGameHours: z.coerce.number(),
      denyPlayersWithNoSkillAssigned: z.coerce.boolean().default(false),
    }),
  ),
  save: async v => {
    await Promise.all([
      configuration.set('players.etf2l_account_required', v.etf2lAccountRequired),
      configuration.set('players.minimum_in_game_hours', v.minimumInGameHours),
      configuration.set(
        'queue.deny_players_with_no_skill_assigned',
        v.denyPlayersWithNoSkillAssigned,
      ),
      configuration.set(
        'queue.player_skill_threshold',
        v.playerSkillThresholdEnabled ? v.playerSkillThreshold : null,
      ),
    ])
  },
  page: async user => await PlayerRestrictionsPage({ user }),
})
