import { config } from './config'
import { getSlots } from './get-slots'
import { getState } from '../queue/get-state'
import { getMapWinner } from './get-map-winner'
import { collections } from '../database/collections'
import { logger } from '../logger'
import { reset } from './reset'
import { resetMapOptions } from '../maps/reset-options'
import { getFriends } from './get-friends'
import { getMapVoteResults } from './get-map-vote-results'
import { enabledGamemodes } from '../shared/enabled-gamemodes'

for (const gamemode of enabledGamemodes) {
  const slotCount = await collections.queueSlots.countDocuments({ gamemode })
  if (slotCount === 0) {
    logger.info(`no queue initialized for ${gamemode}, initializing one now...`)
    await reset(gamemode)
  }
}

export const queue = {
  config,
  getFriends,
  getMapVoteResults,
  getMapWinner,
  getSlots,
  getState,
  resetMapOptions,
} as const
