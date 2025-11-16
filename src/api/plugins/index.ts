import fp from 'fastify-plugin'
import { version } from '../../version'
import { jsonSchemaTransform } from 'fastify-type-provider-zod'
import { environment } from '../../environment'

export default fp(async app => {
  await app.register(await import('@fastify/swagger'), {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'tf2pickup.org API',
        description: `API documentation for tf2pickup.org, hosted at ${environment.WEBSITE_URL}/api`,
        version,
      },
      servers: [
        {
          url: environment.WEBSITE_URL,
          description: environment.WEBSITE_NAME,
        },
      ],
      tags: [
        { name: 'queue', description: 'queue related end-points' },
        { name: 'games', description: 'games related end-points' },
        { name: 'players', description: 'players related end-points' },
      ],
    },
    transform: jsonSchemaTransform,
  })

  await app.register(import('@fastify/swagger-ui'), {
    routePrefix: '/api',
    uiConfig: {
      docExpansion: 'full',
      deepLinking: false,
    },
    staticCSP: true,
    transformSpecificationClone: true,
  })
})
