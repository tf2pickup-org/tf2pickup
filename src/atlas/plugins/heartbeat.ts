import { minutesToMilliseconds, secondsToMilliseconds } from 'date-fns'
import { debounce } from 'es-toolkit'
import fp from 'fastify-plugin'
import { environment } from '../../environment'
import { events } from '../../events'
import { safe } from '../../utils/safe'
import { sendHeartbeat } from '../send-heartbeat'

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
  },
  { name: 'atlas heartbeat' },
)
