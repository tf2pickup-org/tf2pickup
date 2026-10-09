import { requestContext } from '@fastify/request-context'

export function isCurrentPage(href: string) {
  const path = requestContext.get('url')?.split(/[?#]/)[0]
  return path === href || path?.startsWith(`${href}/`) === true
}
