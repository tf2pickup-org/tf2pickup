import type { FindOneAndUpdateOptions, StrictUpdateFilter } from 'mongodb'
import type { SteamId64 } from '../shared/types/steam-id-64'
import type { PlayerModel } from '../database/models/player.model'
import { mutex } from './mutex'
import { collections } from '../database/collections'
import { events } from '../events'
import { bySteamId } from './by-steam-id'

export async function update(
  steamId: SteamId64,
  update: StrictUpdateFilter<PlayerModel>,
  options?: FindOneAndUpdateOptions,
): Promise<PlayerModel> {
  return await mutex.runExclusive(async () => {
    const before = await bySteamId(steamId)
    const after = (await collections.players.findOneAndUpdate({ steamId }, update, {
      returnDocument: 'after',
      ...options,
    }))!

    events.emit('player:updated', { before, after })
    return after
  })
}
