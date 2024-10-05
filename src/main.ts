import fastify from 'fastify'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'
import { resolve } from 'node:path'
import { logger as loggerInstance } from './logger'
import { environment } from './environment'
import { secrets } from './secrets'
import { hoursToSeconds } from 'date-fns'

const app = fastify({ loggerInstance })

app.setSerializerCompiler(serializerCompiler)
app.setValidatorCompiler(validatorCompiler)

await app.register(await import('@fastify/sensible'))
await app.register(await import('@fastify/formbody'))
await app.register(await import('@fastify/cookie'), {
  secret: environment.AUTH_SECRET,
  hook: 'onRequest',
})
await app.register(await import('@fastify/secure-session'), {
  key: await secrets.get('session'),
  expiry: hoursToSeconds(24),
  cookie: {
    path: '/',
    httpOnly: true,
  },
})
await app.register((await import('@fastify/flash')).default)
await app.register(await import('@fastify/request-context'))

await app.register((await import('./postcss')).default)
await app.register(await import('@fastify/static'), {
  root: resolve(import.meta.dirname, '..', 'public'),
  prefix: '/',
})

await app.register((await import('@kitajs/fastify-html-plugin')).default)

for (const path of [
  './messages',
  './tasks',
  './ws',
  './auth',
  './queue',
  './online-players',
  './players',
  './games',
  './static-game-servers',
  './game-servers',
  './log-receiver',
  './documents',
  './statistics',
  './twitch-tv',
  './admin',
]) {
  await app.register((await import(path)).default)
}

await app.listen({ port: 3000 })
