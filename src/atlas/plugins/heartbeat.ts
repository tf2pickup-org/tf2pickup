import { minutesToMilliseconds, secondsToMilliseconds, subDays } from 'date-fns'
import { debounce } from 'es-toolkit'
import fp from 'fastify-plugin'
import { environment } from '../../environment'
import { events } from '../../events'
import { safe } from '../../utils/safe'
import { sendHeartbeat } from '../send-heartbeat'
import { sendActivity } from '../send-activity'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    if (!environment.ATLAS_SECRET) {
      return
    }

    const send = debounce(safe(sendHeartbeat), secondsToMilliseconds(3))
    events.on('queue/slots:updated', send)
    events.on('player:connected', send)
    events.on('player:disconnected', send)

    setInterval(safe(sendHeartbeat), minutesToMilliseconds(3)).unref()
    safe(sendHeartbeat)()

    // backfill the full history once on boot, then keep recent days fresh
    setInterval(
      safe(() => sendActivity(subDays(new Date(), 2))),
      minutesToMilliseconds(3),
    ).unref()
    safe(() => sendActivity())()
  },
  { name: 'atlas heartbeat' },
)
