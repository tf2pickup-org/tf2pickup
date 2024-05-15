import { Gateway } from './gateway'

declare module 'fastify' {
  interface FastifyInstance {
    gateway: Gateway
  }
}
