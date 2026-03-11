import type { FastifyRequest } from 'fastify'

// Replicates the behavior of @supercharge/request-ip (used by nestjs-real-ip's RealIP decorator).
// Checks headers in priority order before falling back to the raw socket IP.
const proxyHeaders = [
  'x-forwarded-for',
  'x-forwarded',
  'forwarded-for',
  'forwarded',
  'x-client-ip',
  'x-real-ip',
  'cf-connecting-ip',
  'fastly-client-ip',
  'true-client-ip',
  'x-cluster-client-ip',
] as const

export function realIp(req: FastifyRequest): string {
  for (const header of proxyHeaders) {
    const value = req.headers[header]
    if (typeof value === 'string' && value) {
      // x-forwarded-for may be a comma-separated list; the first entry is the original client
      const first = value.split(',')[0]
      if (first !== undefined) return first.trim()
    }
  }
  return req.socket.remoteAddress ?? req.ip
}
