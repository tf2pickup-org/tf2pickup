import './otel'
import './migrate'
import fastify from 'fastify'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'
import { resolve } from 'node:path'
import { logger, logger as loggerInstance } from './logger'
import { secrets } from './secrets'
import { environment } from './environment'
import { version } from './version'
import { ErrorPage } from './error-pages/views/html/error.page'
import { secondsInWeek } from 'date-fns/constants'
import autoload from '@fastify/autoload'

const app = fastify({ loggerInstance })

app.setSerializerCompiler(serializerCompiler)
app.setValidatorCompiler(validatorCompiler)

logger.info(`starting tf2pickup.org ${version}`)

if (process.env['CI'] !== 'true') {
  await app.register(await import('@fastify/rate-limit'))
}

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
  if ('statusCode' in error) {
    statusCode = error.statusCode
  }

  if ('message' in error) {
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

await app.register((await import('./websocket')).default)

await app.register(autoload, {
  dir: resolve(import.meta.dirname, '.'),
  matchFilter: path => {
    return path.includes('/plugins/')
  },
})

await app.register(autoload, {
  dir: resolve(import.meta.dirname, '.'),
  matchFilter: path => {
    return path.includes('/middleware/')
  },
})

await app.register(autoload, {
  dir: resolve(import.meta.dirname, 'routes'),
  dirNameRoutePrefix: true,
})

await app.listen({ host: environment.APP_HOST, port: environment.APP_PORT })
