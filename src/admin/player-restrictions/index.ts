import { PlayerRestrictionsPage } from './views/html/player-restrictions.page'
import { z } from 'zod'
import { configuration } from '../../configuration'
import { standardAdminPage } from '../plugins/standard-admin-page'

export default standardAdminPage({
  path: '/admin/player-restrictions',
  bodySchema: z.object({
    etf2lAccountRequired: z.coerce.boolean().default(false),
    minimumInGameHours: z.coerce.number(),
    denyPlayersWithNoSkillAssigned: z.coerce.boolean().default(false),
  }),
  save: async ({ etf2lAccountRequired, minimumInGameHours, denyPlayersWithNoSkillAssigned }) => {
    await Promise.all([
      configuration.set('players.etf2l_account_required', etf2lAccountRequired),
      configuration.set('players.minimum_in_game_hours', minimumInGameHours),
      configuration.set(
        'queue.deny_players_with_no_skill_assigned',
        denyPlayersWithNoSkillAssigned,
      ),
    ])
  },
  page: async user => await PlayerRestrictionsPage({ user }),
})
