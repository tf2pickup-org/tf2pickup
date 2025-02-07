import fp from 'fastify-plugin'
import { bundles } from '../bundle'

export default fp(async app => {
  app.get('/:filename.js', async (request, reply) => {
    const filename = (request.params as { filename: string }).filename
    const bundle = bundles.get(`${filename}.js`)
    if (!bundle) {
      return reply.notFound()
    }
    reply.header('Content-Type', 'application/javascript; charset=utf-8').send(bundle)
  })
})
