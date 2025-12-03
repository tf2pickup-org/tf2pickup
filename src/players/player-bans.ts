import type { PlayerBan } from '../database/models/player.model'
import { collections } from '../database/collections'
import { events } from '../events'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { errors } from '../errors'

export async function getBansForPlayer(steamId: SteamId64): Promise<PlayerBan[]> {
  const playerBans = await collections.playerBans.findOne({ steamId })
  return playerBans?.bans ?? []
}

export async function addBanForPlayer(
  steamId: SteamId64,
  ban: PlayerBan,
): Promise<void> {
  await collections.playerBans.updateOne(
    { steamId },
    {
      $push: { bans: ban },
    },
    { upsert: true },
  )
  events.emit('player/ban:added', { player: steamId, ban })
}

export async function revokeBanForPlayer(
  steamId: SteamId64,
  banStart: Date,
  admin: SteamId64,
): Promise<PlayerBan> {
  const playerBans = await collections.playerBans.findOne({ steamId })
  if (!playerBans) {
    throw errors.notFound(`No bans found for player ${steamId}`)
  }

  const ban = playerBans.bans.find(b => b.start.getTime() === banStart.getTime())
  if (!ban) {
    throw errors.notFound(`Ban not found for player ${steamId}`)
  }

  // Update the ban's end date to now
  const updatedBan: PlayerBan = {
    ...ban,
    end: new Date(),
  }

  await collections.playerBans.updateOne(
    { steamId },
    {
      $set: {
        'bans.$[ban].end': new Date(),
      },
    },
    {
      arrayFilters: [{ 'ban.start': { $eq: banStart } }],
    },
  )

  events.emit('player/ban:revoked', { player: steamId, ban: updatedBan, admin })
  return updatedBan
}
