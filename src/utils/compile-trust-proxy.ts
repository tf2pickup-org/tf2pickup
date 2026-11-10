import proxyAddr from '@fastify/proxy-addr'

export function compileTrustProxy(value: string) {
  return proxyAddr.compile(
    value
      .split(',')
      .map(it => it.trim())
      .filter(Boolean),
  )
}
