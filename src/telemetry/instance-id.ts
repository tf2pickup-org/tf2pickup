import { createHash } from 'node:crypto'
import { environment } from '../environment'

/**
 * Stable, anonymous identifier for this instance. Derived from the website URL
 * so it survives restarts and redeploys without storing anything, while not
 * exposing the URL itself to the telemetry service.
 */
export const instanceId = createHash('sha256').update(environment.WEBSITE_URL).digest('hex')
