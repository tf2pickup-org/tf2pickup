import { environment } from '../environment'
import { logger } from '../logger'
import { queueConfigs } from './configs'

logger.info(`using queue config: ${environment.QUEUE_CONFIG}`)
export const config = queueConfigs[environment.QUEUE_CONFIG]
