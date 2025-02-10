import fp from 'fastify-plugin'
import { bundles } from '../bundle'
import { environment } from '../../environment'

export default fp(async app => {
  await app.register(await import('@fastify/etag'))

  app.get('/:filename.js', async (request, reply) => {
    const filename = (request.params as { filename: string }).filename
    const bundle = bundles.get(`${filename}.js`)
    if (!bundle) {
      return reply.notFound()
    }

    if (environment.NODE_ENV === 'production') {
      reply.header('Cache-Control', 'public, max-age=31536000, immutable')
    }

    reply.header('Content-Type', 'application/javascript; charset=utf-8').send(bundle)
  })
})
