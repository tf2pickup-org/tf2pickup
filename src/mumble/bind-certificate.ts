import { collections } from '../database/collections'
import type { MumbleVerificationMethod } from '../database/models/player.model'
import { events } from '../events'
import { players } from '../players'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { verificationCount } from './verification-count'

export type BindCertificateResult =
  { outcome: 'bound' } | { outcome: 'alreadyBound' } | { outcome: 'conflict'; owner: SteamId64 }

export async function bindCertificate(
  player: SteamId64,
  hash: string,
  method: MumbleVerificationMethod,
): Promise<BindCertificateResult> {
  const result = await bind(player, hash, method)
  verificationCount.add(1, { method, outcome: result.outcome })
  if (result.outcome === 'conflict') {
    events.emit('mumble/certificateConflict', { player, owner: result.owner })
  }
  return result
}

async function bind(
  player: SteamId64,
  hash: string,
  method: MumbleVerificationMethod,
): Promise<BindCertificateResult> {
  const owner = await collections.players.findOne(
    { 'mumbleCertificate.hash': hash },
    { projection: { steamId: 1 } },
  )
  if (owner) {
    return owner.steamId === player
      ? { outcome: 'alreadyBound' }
      : { outcome: 'conflict', owner: owner.steamId }
  }

  // ponytail: two players binding the same certificate at once loses to the unique index
  // and surfaces as an error, not a conflict; fine at Mumble's message rate
  await players.update(player, {
    $set: { mumbleCertificate: { hash, boundAt: new Date(), method } },
  })
  return { outcome: 'bound' }
}
