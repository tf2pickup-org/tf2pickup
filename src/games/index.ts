import { update } from './update'
import { findOne } from './find-one'
import { gameNumber } from './schemas/game-number'
import { gameServerSelection } from './schemas/game-server-selection'
import { requestSubstitute } from './request-substitute'
import { replacePlayer } from './replace-player'
import { forceEnd } from './force-end'
import { reinitializeGameServer } from './request-game-server-reinitialization'
import { assignGameServer } from './assign-game-server'
import { configure, cancelConfigure } from './rcon/configure'

export const games = {
  assignGameServer,
  cancelConfigure,
  configure,
  findOne,
  forceEnd,
  replacePlayer,
  reinitializeGameServer,
  requestSubstitute,
  update,

  schemas: {
    gameNumber,
    gameServerSelection,
  },
} as const
