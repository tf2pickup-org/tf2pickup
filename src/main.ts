import fastify from 'fastify'
import kitaHtml from '@kitajs/fastify-html-plugin'
import postcss from './postcss'
import ws from './ws/plugin'
import auth from './auth/plugin'
import queue from './queue/plugin'
import onlinePlayers from './online-players/plugin'
import players from './players/plugin'
import { resolve } from 'node:path'
import { logger } from './logger'

const app = fastify({ logger })

await app.register(await import('@fastify/cookie'), {
  secret: 'dupa13',
  hook: 'onRequest',
})

await app.register(postcss)

await app.register(await import('@fastify/static'), {
  root: resolve(import.meta.dirname, '..', 'public'),
  prefix: '/',
})

await app.register(kitaHtml)
await app.register(ws)
await app.register(auth)
await app.register(queue)
await app.register(onlinePlayers)
await app.register(players)

await app.listen({ port: 3000 })
