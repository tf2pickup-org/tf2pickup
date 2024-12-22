import type { ZodSchema, ZodTypeDef } from 'zod'
import fp from 'fastify-plugin'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { PlayerRole } from '../../database/models/player.model'
import type { User } from '../../auth/types/user'
import { requestContext } from '@fastify/request-context'

interface StandardAdminPageArgs<Input, Output> {
  path: string
  bodySchema: ZodSchema<Input, ZodTypeDef, Output>
  save: (body: Input) => Promise<void>
  page: (user: User) => Promise<string>
}

export function standardAdminPage<Input, Output>({
  path,
  bodySchema,
  save,
  page,
}: StandardAdminPageArgs<Input, Output>) {
  return fp(
    // eslint-disable-next-line @typescript-eslint/require-await
    async app => {
      app
        .withTypeProvider<ZodTypeProvider>()
        .get(
          path,
          {
            config: {
              authorize: [PlayerRole.admin],
            },
          },
          async (request, reply) => {
            return reply.status(200).html(page(request.user!))
          },
        )
        .post(
          path,
          {
            config: {
              authorize: [PlayerRole.admin],
            },
            schema: {
              body: bodySchema,
            },
          },
          async (request, reply) => {
            await save(request.body as Input)
            requestContext.set('messages', { success: ['Configuration saved'] })
            return reply.status(200).html(page(request.user!))
          },
        )
    },
    {
      name: `admin - ${path}`,
    },
  )
}
