import { minutesToMilliseconds } from 'date-fns'
import fp from 'fastify-plugin'
import { safe } from '../../utils/safe'
import { refreshStreams } from '../refresh-streams'
import { twitchTv } from '..'

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(async app => {
  if (!twitchTv.enabled) {
    return
  }

  app.addHook('onReady', async () => {
    setInterval(safe(refreshStreams), minutesToMilliseconds(1))
    await refreshStreams()
  })
})
