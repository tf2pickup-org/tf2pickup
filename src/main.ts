import './migrate'
import fastify from 'fastify'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'
import { resolve } from 'node:path'
import { logger, logger as loggerInstance } from './logger'
import { secrets } from './secrets'
import { hoursToSeconds } from 'date-fns'
import { environment } from './environment'
import { version } from './version'
import { ErrorPage } from './error-pages/views/html/error.page'
import { HttpError } from '@fastify/sensible'

const app = fastify({ loggerInstance })

app.setSerializerCompiler(serializerCompiler)
app.setValidatorCompiler(validatorCompiler)

logger.info(`starting tf2pickup.org ${version}`)

await app.register(await import('@fastify/sensible'))
await app.register(await import('@fastify/formbody'))
await app.register(await import('@fastify/cookie'), {
  secret: await secrets.get('cookie'),
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
await app.register(await import('@fastify/static'), {
  root: resolve(import.meta.dirname, '..', 'public'),
  prefix: '/',
})
await app.register(await import('@fastify/accepts'))
await app.register((await import('@kitajs/fastify-html-plugin')).default)

app.setErrorHandler((error, request, reply) => {
  logger.error(error)

  let statusCode = 500
  let message = 'Internal Server Error'
  if (error instanceof HttpError) {
    statusCode = error.statusCode
    message = error.message
  }

  const accept = request.accepts()
  switch (accept.type(['json', 'html'])) {
    case 'json':
      return reply.type('application/json').code(statusCode).send({ message })
    case 'html':
      return reply.code(statusCode).html(ErrorPage({ user: request.user, message }))
    default:
      return reply.code(406).send('Not Acceptable')
  }
})

app.setNotFoundHandler(async (request, reply) => {
  const accept = request.accepts()
  switch (accept.type(['json', 'html'])) {
    case 'json':
      return reply.type('application/json').code(404).send({ message: 'Not found' })
    case 'html':
      return reply.code(404).html(ErrorPage({ user: request.user, message: 'Not found' }))
    default:
      return reply.code(406).send('Not Acceptable')
  }
})

await app.register((await import('./html')).default)
await app.register((await import('./websocket')).default)
await app.register((await import('./auth')).default)
await app.register((await import('./queue')).default)
await app.register((await import('./online-players')).default)
await app.register((await import('./players')).default)
await app.register((await import('./games')).default)
await app.register((await import('./static-game-servers')).default)
await app.register((await import('./game-servers')).default)
await app.register((await import('./log-receiver')).default)
await app.register((await import('./documents')).default)
await app.register((await import('./statistics')).default)
await app.register((await import('./twitch-tv')).default)
await app.register((await import('./admin')).default)
await app.register((await import('./hall-of-game')).default)
await app.register((await import('./pre-ready')).default)
await app.register((await import('./serveme-tf')).default)
await app.register((await import('./mumble')).default)
await app.register((await import('./logs-tf')).default)

await app.listen({ host: environment.APP_HOST, port: environment.APP_PORT })
