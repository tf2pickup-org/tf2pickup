import { update } from './update'
import { findOne } from './find-one'
import { gameNumber } from './schemas/game-number'
import { gameLifecycle } from './lifecycle'
import { requestGameServerReinitialization } from './request-game-server-reinitialization'
import { assignAndConfigure } from './assign-and-configure'
import { executeRconCommand } from './execute-rcon-command'

export const games = {
  assignAndConfigure,
  executeRconCommand,
  findOne,
  lifecycle: gameLifecycle,
  requestGameServerReinitialization,
  update,

  schemas: {
    gameNumber,
  },
}
