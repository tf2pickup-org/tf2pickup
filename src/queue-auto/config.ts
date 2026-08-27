import { logger } from '../logger'
import { defaultGamemode } from '../shared/default-gamemode'
import { getQueueConfig } from './configs'

logger.info(`using default queue config: ${defaultGamemode}`)
export const config = getQueueConfig(defaultGamemode)
