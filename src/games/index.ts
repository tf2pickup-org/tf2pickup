import { update } from './update'
import { findOne } from './find-one'
import { gameNumber } from './schemas/game-number'
import { gameServerSelection } from './schemas/game-server-selection'
import { requestSubstitute } from './request-substitute'
import { replacePlayer } from './replace-player'
import { forceEnd } from './force-end'
import { requestGameServerReinitialization } from './request-game-server-reinitialization'
import { assignGameServer } from './assign-game-server'

export const games = {
  assignGameServer,
  findOne,
  forceEnd,
  replacePlayer,
  requestGameServerReinitialization,
  requestSubstitute,
  update,

  schemas: {
    gameNumber,
    gameServerSelection,
  },
} as const
