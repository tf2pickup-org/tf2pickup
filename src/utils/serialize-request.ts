import type { FastifyRequest } from 'fastify'
import { redactUrl } from './redact-url'

// Extends Fastify's default request log serializer with the client IP
// (req.ip, validated against TRUST_PROXY) and the User-Agent,
// so both land as queryable req.* attributes through the pino → OTel bridge.
export function serializeRequest(req: FastifyRequest) {
  return {
    method: req.method,
    url: redactUrl(req.url),
    host: req.host,
    remoteAddress: req.ip,
    remotePort: req.socket.remotePort,
    clientIp: req.ip,
    userAgent: req.headers['user-agent'],
  }
}
