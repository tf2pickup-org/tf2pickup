import pino from 'pino'
import { environment } from './environment'

export const logger = pino({
  level: environment.LOG_LEVEL,
  ...(environment.NODE_ENV === 'production' ? {} : { transport: { target: 'pino-princess' } }),
})
