import type { FindOneAndUpdateOptions, StrictUpdateFilter } from 'mongodb'
import type { SteamId64 } from '../shared/types/steam-id-64'
import type { PlayerModel } from '../database/models/player.model'
import { forPlayer } from './mutex'
import { collections } from '../database/collections'
import { events } from '../events'
import { errors } from '../errors'

type PlayerUpdateFactory = (before: PlayerModel) => StrictUpdateFilter<PlayerModel>

const historyProjection = { eloHistory: 0, skillHistory: 0, nameHistory: 0 } as const

export async function update(
  steamId: SteamId64,
  updateOrFactory: StrictUpdateFilter<PlayerModel> | PlayerUpdateFactory,
  options?: FindOneAndUpdateOptions,
  adminId?: SteamId64,
): Promise<PlayerModel> {
  return await forPlayer(steamId).runExclusive(async () => {
    const before = await collections.players.findOne({ steamId }, { projection: historyProjection })
    if (before === null) {
      throw errors.notFound(`Player with steamId ${steamId} does not exist`)
    }

    const updateDoc =
      typeof updateOrFactory === 'function' ? updateOrFactory(before) : updateOrFactory

    const after = (await collections.players.findOneAndUpdate({ steamId }, updateDoc, {
      returnDocument: 'after',
      ...options,
      projection: historyProjection,
    }))!

    events.emit('player:updated', { before, after, adminId })
    return after
  })
}
