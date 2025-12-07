import { isBefore, subMonths } from 'date-fns'
import type { PlayerModel } from '../database/models/player.model'

export function shouldSyncEtf2lProfile(
  player: Pick<PlayerModel, 'etf2lProfileLastSyncedAt'>,
  now = new Date(),
) {
  if (!player.etf2lProfileLastSyncedAt) {
    return true
  }

  const oneMonthAgo = subMonths(now, 1)
  return isBefore(player.etf2lProfileLastSyncedAt, oneMonthAgo)
}
