import type { GameNumber } from '../database/models/game.model'
import { assignGameServer } from './assign-game-server'
import type { SelectGameServer } from './assign-game-server'
import { tasks } from '../tasks'

export async function assignAndConfigure(gameNumber: GameNumber, select: SelectGameServer) {
  await assignGameServer(gameNumber, select)
  await tasks.schedule('games:configureServer', 0, { gameNumber })
}
