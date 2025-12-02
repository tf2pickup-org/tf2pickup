import { minutesToMilliseconds } from 'date-fns'
import { etf2l } from '.'
import { logger } from '../logger'
import { players } from '../players'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { Etf2lApiError } from './errors/etf2l-api.error'
import { tasks } from '../tasks'

export async function syncPlayerProfile(playerId: SteamId64) {
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
          await tasks.schedule('etf2l:syncPlayerProfile', minutesToMilliseconds(10), {
            player: player.steamId,
          })
          break
        default:
          throw error
      }
    }
  }
}
