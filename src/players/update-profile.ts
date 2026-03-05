import type { SteamId64 } from '../shared/types/steam-id-64'
import { mutex } from './mutex'
import { collections } from '../database/collections'
import { events } from '../events'
import { errors } from '../errors'

interface UpdateProfileParams {
  steamId: SteamId64
  name: string
  cooldownLevel: number
  adminId: SteamId64
}

export async function updateProfile({
  steamId,
  name,
  cooldownLevel,
  adminId,
}: UpdateProfileParams): Promise<void> {
  await mutex.runExclusive(async () => {
    const before = await collections.players.findOne({ steamId })
    if (before === null) {
      throw errors.notFound(`Player with steamId ${steamId} does not exist`)
    }

    const update: Record<string, unknown> = { $set: { name, cooldownLevel } }
    if (before.name !== name) {
      update['$push'] = { nameHistory: { name: before.name, changedAt: new Date() } }
    }

    const after = (await collections.players.findOneAndUpdate({ steamId }, update, {
      returnDocument: 'after',
    }))!

    events.emit('player:updated', { before, after, adminId })
  })
}
