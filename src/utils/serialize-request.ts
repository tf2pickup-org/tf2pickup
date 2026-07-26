import type { FastifyRequest } from 'fastify'
import { realIp } from './real-ip'

// Extends Fastify's default request log serializer with the real client IP
// (resolved the same way as the rate-limit keyGenerator) and the User-Agent,
// so both land as queryable req.* attributes through the pino → OTel bridge.
export function serializeRequest(req: FastifyRequest) {
  return {
    method: req.method,
    url: req.url,
    host: req.host,
    remoteAddress: req.ip,
    remotePort: req.socket.remotePort,
    clientIp: realIp(req),
    userAgent: req.headers['user-agent'],
  }
}
