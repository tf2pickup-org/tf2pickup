import { environment } from '../environment'
import { queueConfigs } from './configs'

export const config = queueConfigs[environment.QUEUE_CONFIG]
