import fp from 'fastify-plugin'
import { events } from '../../events'
import { safe } from '../../utils/safe'
import { configuration } from '../../configuration'
import { collections } from '../../database/collections'
import { players } from '..'
import type { PlayerModel } from '../../database/models/player.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'

function isEligibleForAutoVerification(player: Pick<PlayerModel, 'skill' | 'stats'>): boolean {
  const hasSkill = player.skill !== undefined && Object.keys(player.skill).length > 0
  return hasSkill || player.stats.totalGames > 0
}

async function verify(steamId: SteamId64): Promise<void> {
  await players.update(steamId, { $set: { verified: true } })
}

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on(
      'player:updated',
      safe(async ({ after }) => {
        if (after.verified || !isEligibleForAutoVerification(after)) {
          return
        }

        if (await configuration.get('queue.require_player_verification')) {
          await verify(after.steamId)
        }
      }),
    )

    events.on(
      'configuration:updated',
      safe(async ({ key }) => {
        if (key !== 'queue.require_player_verification') {
          return
        }

        if (!(await configuration.get('queue.require_player_verification'))) {
          return
        }

        await collections.players.updateMany(
          {
            verified: { $ne: true },
            $or: [{ skill: { $exists: true, $ne: {} } }, { 'stats.totalGames': { $gt: 0 } }],
          },
          { $set: { verified: true } },
        )
      }),
    )
  },
  {
    name: 'auto verify eligible players',
  },
)
