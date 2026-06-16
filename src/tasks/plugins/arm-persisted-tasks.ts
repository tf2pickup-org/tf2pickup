import fp from 'fastify-plugin'
import { collections } from '../../database/collections'
import { arm } from '../arm'

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(async app => {
  app.addHook('onReady', async () => {
    const persisted = await collections.tasks.find().toArray()
    for (const task of persisted) {
      arm(task)
    }
  })
})
