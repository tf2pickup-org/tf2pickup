import fp from 'fastify-plugin'
import { minutesToMilliseconds } from 'date-fns'
import { client } from '../client'
import { safe } from '../../utils/safe'
import { bumpQueuePrompts } from '../bump-queue-prompts'

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(async app => {
  if (!client) {
    return
  }

  app.addHook('onReady', async () => {
    setInterval(safe(bumpQueuePrompts), minutesToMilliseconds(5))
    await bumpQueuePrompts()
  })
})
