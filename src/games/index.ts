import { update } from './update'
import { findOne } from './find-one'
import { gameNumber } from './schemas/game-number'
import { requestSubstitute } from './request-substitute'
import { replacePlayer } from './replace-player'
import { forceEnd } from './force-end'
import { requestGameServerReinitialization } from './request-game-server-reinitialization'
import { assignAndConfigure } from './assign-and-configure'

export const games = {
  assignAndConfigure,
  findOne,
  forceEnd,
  replacePlayer,
  requestGameServerReinitialization,
  requestSubstitute,
  update,

  schemas: {
    gameNumber,
  },
}
