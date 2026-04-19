import type { GameNumber } from '../database/models/game.model'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { assignGameServer } from './assign-game-server'
import { configure } from './rcon/configure'
import type { GameServerSelection } from './schemas/game-server-selection'

export async function assignAndConfigure(
  gameNumber: GameNumber,
  selected: GameServerSelection,
  actor: SteamId64,
) {
  await assignGameServer(gameNumber, { selected, actor })
  void configure(gameNumber)
}
