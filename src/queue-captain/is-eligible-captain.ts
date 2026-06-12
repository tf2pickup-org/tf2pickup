import { configuration } from '../configuration'
import type { PlayerModel } from '../database/models/player.model'

export async function isEligibleCaptain(player: Pick<PlayerModel, 'stats'>): Promise<boolean> {
  const minGames = await configuration.get('queue.captain_min_games')
  return player.stats.totalGames >= minGames
}
