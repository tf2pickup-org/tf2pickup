import './migrate'
import fastify from 'fastify'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'
import { resolve } from 'node:path'
import { logger, logger as loggerInstance } from './logger'
import { secrets } from './secrets'
import { environment } from './environment'
import { version } from './version'
import { ErrorPage } from './error-pages/views/html/error.page'
import { HttpError } from '@fastify/sensible'
import { secondsInWeek } from 'date-fns/constants'

const app = fastify({ loggerInstance })

app.setSerializerCompiler(serializerCompiler)
app.setValidatorCompiler(validatorCompiler)

logger.info(`starting tf2pickup.org ${version}`)

await app.register(await import('@fastify/rate-limit'))
await app.register(await import('@fastify/helmet'), {
  contentSecurityPolicy:
    environment.NODE_ENV === 'production'
      ? {
          directives: {
            'script-src-elem': [
              "'self'",
              "'unsafe-inline'",
              ...(environment.UMAMI_SCRIPT_SRC
                ? [new URL(environment.UMAMI_SCRIPT_SRC).origin]
                : []),
            ],
            'img-src': [
              "'self'",
              'https://mapthumbnails.tf2pickup.org',
              'https://steamcdn-a.akamaihd.net',
              'https://avatars.akamai.steamstatic.com',
              'https://avatars.steamstatic.com',
              'https://static-cdn.jtvnw.net',
              'https://cdn.discordapp.com',
            ],
            'connect-src': [
              "'self'",
              ...(environment.UMAMI_SCRIPT_SRC
                ? [new URL(environment.UMAMI_SCRIPT_SRC).origin]
                : []),
            ],
          },
        }
      : false,
})
await app.register(await import('@fastify/sensible'))
await app.register(await import('@fastify/static'), {
  root: [
    ...(environment.WEBSITE_BRANDING
      ? [resolve(import.meta.dirname, '..', 'public', 'branding', environment.WEBSITE_BRANDING)]
      : []),
    resolve(import.meta.dirname, '..', 'public'),
  ],
  prefix: '/',
})
await app.register(await import('@fastify/formbody'))
await app.register(await import('@fastify/secure-session'), {
  key: await secrets.get('session'),
  expiry: secondsInWeek, // 1 week
  cookie: {
    path: '/',
    maxAge: secondsInWeek,
    httpOnly: true,
    secure: environment.NODE_ENV === 'production',
  },
})
await app.register((await import('@fastify/flash')).default)
await app.register(await import('@fastify/request-context'))
await app.register(await import('@fastify/accepts'))
await app.register((await import('@kitajs/fastify-html-plugin')).default)

app.setErrorHandler((error, request, reply) => {
  logger.error(error)

  let statusCode = 500
  let message = 'Internal Server Error'
  if (error instanceof HttpError) {
    statusCode = error.statusCode as number
    message = error.message
  }

  const accept = request.accepts()
  switch (accept.type(['json', 'html'])) {
    case 'json':
      return reply.type('application/json').code(statusCode).send({ message })
    case 'html':
      return reply.code(statusCode).html(ErrorPage({ user: request.user, statusCode, message }))
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
      return reply
        .code(404)
        .html(ErrorPage({ user: request.user, statusCode: 404, message: 'Not found' }))
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
await app.register((await import('./discord')).default)
await app.register((await import('./chat')).default)
await app.register((await import('./player-actions')).default)

await app.listen({ host: environment.APP_HOST, port: environment.APP_PORT })
