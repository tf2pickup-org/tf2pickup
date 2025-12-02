import fp from 'fastify-plugin'
import { minutesToMilliseconds } from 'date-fns'
import { etf2l } from '..'
import { tasks as taskUtils } from '../../tasks'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { Etf2lApiError } from '../errors/etf2l-api.error'
import { logger } from '../../logger'
import { players } from '../../players'

async function syncPlayerProfile(playerId: SteamId64) {
  const player = await players.bySteamId(playerId)

  try {
    const profile = await etf2l.getPlayerProfile(player.steamId)

    await players.update(player.steamId, {
      $set: {
        etf2lProfileId: profile.id,
        etf2lProfileLastSyncedAt: new Date(),
      },
    })
  } catch (error) {
    if (error instanceof Etf2lApiError) {
      switch (error.response.status) {
        case 404:
          await players.update(player.steamId, {
            $unset: { etf2lProfileId: 1 },
          })
          break
        case 429:
          logger.warn(
            { steamId: player.steamId },
            'ETF2L API rate limited while syncing player profile, rescheduling',
          )
          await taskUtils.schedule('etf2l:syncPlayerProfile', minutesToMilliseconds(10), {
            player: player.steamId,
          })
          break
        default:
          throw error
      }
    }
  }
}

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    taskUtils.register('etf2l:syncPlayerProfile', async ({ player }) => {
      await syncPlayerProfile(player)
    })
  },
  { name: 'etf2l - sync player profile' },
)
