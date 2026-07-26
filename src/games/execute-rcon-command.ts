import { activityLog } from '../activity-log'
import { collections } from '../database/collections'
import { GameState, type GameNumber } from '../database/models/game.model'
import { errors } from '../errors'
import { logger } from '../logger'
import type { RconCommand } from '../shared/types/rcon-command'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { withRcon } from './rcon/with-rcon'

export async function executeRconCommand(
  gameNumber: GameNumber,
  command: string,
  actor: SteamId64,
): Promise<string> {
  logger.info({ gameNumber, command, actor }, 'games.executeRconCommand()')
  const game = await collections.games.findOne({ number: gameNumber })
  if (game === null) {
    throw errors.notFound(`game #${gameNumber} not found`)
  }

  if ([GameState.ended, GameState.interrupted].includes(game.state)) {
    throw errors.badRequest(`game #${gameNumber} is over`)
  }

  if (game.gameServer === undefined) {
    throw errors.badRequest(`game #${gameNumber} has no game server assigned`)
  }

  const response = await withRcon(game, async ({ rcon }) => await rcon.send(command as RconCommand))
  await activityLog.record({
    type: 'rcon command executed',
    gameNumber,
    command,
    actor,
  })
  return response
}
