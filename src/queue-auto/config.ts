import { logger } from '../logger'
import { currentGamemode } from '../shared/current-gamemode'
import { getQueueConfig } from './configs'

logger.info(`using queue config: ${currentGamemode}`)
export const config = getQueueConfig(currentGamemode)
