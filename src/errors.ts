import { httpErrors } from '@fastify/sensible'

export const errors = {
  badRequest: httpErrors.badRequest,
  forbidden: httpErrors.forbidden,
  notFound: httpErrors.notFound,
  conflict: httpErrors.conflict,

  internalServerError: httpErrors.internalServerError,
} as const
