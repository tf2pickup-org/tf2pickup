import fastify from 'fastify'
import kitaHtml from '@kitajs/fastify-html-plugin'
import queue from './queue/plugin'
import { resolve } from 'path'

const app = fastify({ logger: { transport: { target: 'pino-pretty' } } })

await app.register(await import('@fastify/static'), {
  root: resolve(import.meta.dirname, '..', 'public'),
  prefix: '/',
})

await app.register(kitaHtml)
await app.register(queue)
await app.listen({ port: 3000 })
