import { secondsToMilliseconds } from 'date-fns'
import { environment } from '../environment'
import { logger } from '../logger'
import { buildSnapshot } from './build-snapshot'

/**
 * Reports this instance's anonymous feature-adoption snapshot to the telemetry
 * service. Enabled by default; operators can opt out with TELEMETRY_DISABLED.
 */
export async function sendTelemetry() {
  if (environment.TELEMETRY_DISABLED) {
    return
  }

  const response = await fetch(new URL('/api/telemetry', environment.TELEMETRY_URL), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(await buildSnapshot()),
    signal: AbortSignal.timeout(secondsToMilliseconds(10)),
  })

  if (!response.ok) {
    logger.warn({ status: response.status }, 'telemetry rejected')
  }
}
