import { update } from './update'
import { getSubstitutionRequests } from './get-substitution-requests'
import { findOne } from './find-one'
import { gameNumber } from './schemas/game-number'
import { requestSubstitute } from './request-substitute'
import { replacePlayer } from './replace-player'
import { forceEnd } from './force-end'
import { requestGameServerReinitialization } from './request-game-server-reinitialization'

export const games = {
  findOne,
  forceEnd,
  getSubstitutionRequests,
  replacePlayer,
  requestGameServerReinitialization,
  requestSubstitute,
  update,

  schemas: {
    gameNumber,
  },
} as const
