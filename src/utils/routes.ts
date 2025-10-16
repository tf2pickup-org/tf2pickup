import type {
  FastifyBaseLogger,
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
  FastifyTypeProvider,
  FastifyTypeProviderDefault,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerBase,
  RawServerDefault,
} from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

export function routes<
  Options extends FastifyPluginOptions = Record<never, never>,
  RawServer extends RawServerBase = RawServerDefault,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault,
  Logger extends FastifyBaseLogger = FastifyBaseLogger,
>(fn: FastifyPluginAsync<Options, RawServer, ZodTypeProvider, Logger>) {
  return async function (
    app: FastifyInstance<
      RawServer,
      RawRequestDefaultExpression<RawServer>,
      RawReplyDefaultExpression<RawServer>,
      Logger,
      TypeProvider
    >,
    options: Options,
  ) {
    await fn(app.withTypeProvider<ZodTypeProvider>(), options)
  }
}
