import { milliseconds } from 'date-fns'
import fp from 'fastify-plugin'
import { environment } from '../../environment'
import { logger } from '../../logger'
import { safe } from '../../utils/safe'
import { sendTelemetry } from '../send-telemetry'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    if (environment.NODE_ENV !== 'production' || environment.CI || environment.TELEMETRY_DISABLED) {
      return
    }

    logger.info('anonymous telemetry enabled; opt out with TELEMETRY_DISABLED=true')

    setInterval(safe(sendTelemetry), milliseconds({ days: 1 })).unref()
    safe(sendTelemetry)()
  },
  { name: 'telemetry' },
)
