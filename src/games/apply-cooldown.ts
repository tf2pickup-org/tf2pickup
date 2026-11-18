import { logger } from '../logger'
import type { GameNumber } from '../database/models/game.model'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { applyEscalatingCooldown } from './apply-escalating-cooldown'

export async function applyCooldown(steamId: SteamId64, gameNumber: GameNumber) {
  logger.trace({ steamId, gameNumber }, 'players.applyCooldown()')
  await applyEscalatingCooldown(steamId, `Not connecting to game #${gameNumber} in time`)
}
