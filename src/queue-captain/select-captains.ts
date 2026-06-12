import { collections } from '../database/collections'
import type { QueuePlayerModel } from '../database/models/queue-player.model'
import { logger } from '../logger'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { isEligibleCaptain } from './is-eligible-captain'
import { players } from '../players'

export async function selectCaptains(): Promise<[SteamId64, SteamId64] | null> {
  const optedIn = await collections.queuePlayers.find({ wantsCaptain: true }).toArray()

  const eligible: QueuePlayerModel[] = []
  for (const p of optedIn) {
    const playerDoc = await players.bySteamId(p.steamId, ['stats'])
    if (await isEligibleCaptain(playerDoc)) {
      eligible.push(p)
    }
  }

  if (eligible.length < 2) {
    logger.info({ eligible: eligible.length }, 'not enough eligible captains')
    return null
  }

  const shuffled = eligible.sort(() => Math.random() - 0.5)
  return [shuffled[0]!.steamId, shuffled[1]!.steamId]
}
