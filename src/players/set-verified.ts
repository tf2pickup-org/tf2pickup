import type { SteamId64 } from '../shared/types/steam-id-64'
import { update } from './update'

export async function setVerified(
  steamId: SteamId64,
  verified: boolean,
  actor: SteamId64,
): Promise<void> {
  await update(steamId, { $set: { verified } }, {}, actor)
}
