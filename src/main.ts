import fastify from 'fastify'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'
import kitaHtml from '@kitajs/fastify-html-plugin'
import postcss from './postcss'
import ws from './ws/plugin'
import auth from './auth/plugin'
import queue from './queue/plugin'
import onlinePlayers from './online-players/plugin'
import players from './players/plugin'
import games from './games/plugin'
import staticGameServers from './static-game-servers/plugin'
import gameServers from './game-servers/plugin'
import { resolve } from 'node:path'
import { logger } from './logger'

const app = fastify({ logger })

app.setSerializerCompiler(serializerCompiler)
app.setValidatorCompiler(validatorCompiler)

await app.register(await import('@fastify/formbody'))
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
await app.register(games)
await app.register(staticGameServers)
await app.register(gameServers)
await app.register((await import('./log-receiver')).default)
await app.register((await import('./documents')).default)
await app.register((await import('./statistics')).default)

await app.listen({ port: 3000 })
