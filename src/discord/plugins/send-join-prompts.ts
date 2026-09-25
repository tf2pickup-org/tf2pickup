import { secondsToMilliseconds } from 'date-fns'
import { debounce } from 'es-toolkit'
import fp from 'fastify-plugin'
import { events } from '../../events'
import { safe } from '../../utils/safe'
import { client } from '../client'
import { refreshQueuePrompts } from '../refresh-queue-prompts'

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(async () => {
  if (!client) {
    return
  }

  events.on('queue/slots:updated', debounce(safe(refreshQueuePrompts), secondsToMilliseconds(3)))
})
