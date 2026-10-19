import type { PlayerModel } from '../database/models/player.model'
import { gamemodesInUse } from '../queues/gamemodes-in-use'
import { Gamemode } from '../shared/types/gamemode'

// Gamemodes to show a player's skill and stats for: those the instance plays, and any other the
// player has a skill or games in.
export async function playerGamemodes(
  player: Pick<PlayerModel, 'skill' | 'stats'>,
): Promise<Gamemode[]> {
  const played = Object.values(Gamemode).filter(
    gamemode =>
      player.skill?.[gamemode] !== undefined ||
      Object.keys(player.stats.gamesByClass[gamemode] ?? {}).length > 0,
  )
  return [...new Set([...(await gamemodesInUse()), ...played])]
}
