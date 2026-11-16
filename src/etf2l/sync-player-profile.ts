import { minutesToMilliseconds } from 'date-fns'
import { etf2l } from '.'
import { logger } from '../logger'
import { players } from '../players'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { Etf2lApiError } from './errors/etf2l-api.error'
import { tasks } from '../tasks'
import { mirrorBans } from './mirror-bans'

export async function syncPlayerProfile(playerId: SteamId64) {
  const player = await players.bySteamId(playerId, ['steamId'])

  try {
    const profile = await etf2l.getPlayerProfile(player.steamId)

    await players.update(player.steamId, {
      $set: {
        etf2lProfile: {
          id: profile.id,
          name: profile.name,
          country: profile.country,
        },
        etf2lProfileLastSyncedAt: new Date(),
      },
    })
    await mirrorBans(player.steamId, profile.bans ?? [])
  } catch (error) {
    if (error instanceof Etf2lApiError) {
      switch (error.response.status) {
        case 404:
          await players.update(player.steamId, {
            $unset: { etf2lProfile: 1 },
            $set: { etf2lProfileLastSyncedAt: new Date() },
          })
          break
        case 429:
          logger.debug(
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
