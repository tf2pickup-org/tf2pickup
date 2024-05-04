import fp from 'fastify-plugin'
import { queue } from './views/queue'

export default fp(async app => {
  app.get('/', (req, res) => {
    res.status(200).html(queue())
  })
})
