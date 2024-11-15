import pino from 'pino'
import { environment } from './environment'

export const logger = pino({
  level: 'trace',
  ...(environment.NODE_ENV === 'production' ? {} : { transport: { target: 'pino-princess' } }),
})
