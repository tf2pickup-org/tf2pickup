import fp from 'fastify-plugin'
import { queue } from './views/queue'
import { initialize } from './initialize'

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(async app => {
  await initialize()

  app.get('/', async (req, res) => {
    res.status(200).html(await queue())
  })
})
