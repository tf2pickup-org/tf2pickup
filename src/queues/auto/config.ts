import { environment } from '../../environment'
import { logger } from '../../logger'
import { gamemodeConfigs } from '../../gamemodes/configs'

logger.info(`using queue config: ${environment.QUEUE_CONFIG}`)
export const config = gamemodeConfigs[environment.QUEUE_CONFIG]
