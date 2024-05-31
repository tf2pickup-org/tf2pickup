import type { StrictUpdateFilter } from 'mongodb'
import type { SteamId64 } from '../shared/types/steam-id-64'
import type { PlayerModel } from '../database/models/player.model'
import { mutex } from './mutex'
import { collections } from '../database/collections'
import { PlayerNotFoundError } from './errors'
import { events } from '../events'

export async function update(
  steamId: SteamId64,
  update: StrictUpdateFilter<PlayerModel>,
): Promise<PlayerModel> {
  return await mutex.runExclusive(async () => {
    const before = await collections.players.findOne({ steamId })
    if (!before) {
      throw new PlayerNotFoundError(steamId)
    }

    const after = (await collections.players.findOneAndUpdate({ steamId }, update, {
      returnDocument: 'after',
    }))!

    events.emit('player:updated', { before, after })
    return after
  })
}
