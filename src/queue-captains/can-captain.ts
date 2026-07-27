import { configuration } from '../configuration'
import type { PlayerModel } from '../database/models/player.model'

/**
 * Whether a player has played enough games to volunteer as captain. Returns the reason they
 * cannot, so the UI can explain the locked toggle rather than just disabling it.
 */
export async function canCaptain(
  player: Pick<PlayerModel, 'stats'>,
): Promise<{ eligible: true } | { eligible: false; reason: string }> {
  const minGames = await configuration.get('queue.captains.min_games')
  if (player.stats.totalGames < minGames) {
    return {
      eligible: false,
      reason: `You need ${minGames} games to captain — you have ${player.stats.totalGames}`,
    }
  }

  return { eligible: true }
}
