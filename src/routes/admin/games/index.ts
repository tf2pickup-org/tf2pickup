import { PlayerRole } from '../../../database/models/player.model'
import { CooldownLevelEntry, GamesPage } from '../../../admin/games/views/html/games.page'
import { WhitelistId } from '../../../admin/games/views/html/whitelist-id'
import { z } from 'zod'
import { LogsTfUploadMethod } from '../../../shared/types/logs-tf-upload-method'
import { requestContext } from '@fastify/request-context'
import { secondsToMilliseconds } from 'date-fns'
import { routes } from '../../../utils/routes'
import { configuration } from '../../../configuration'
import { durationUnit } from '../../../admin/games/duration-unit'
import { Gamemode } from '../../../shared/types/gamemode'
import { defaultGamemode } from '../../../shared/default-gamemode'

// A single form field is submitted as a scalar, multiple as an array; normalize both to an array.
const formArray = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value): unknown[] => {
    if (value === undefined) return []
    return Array.isArray(value) ? (value as unknown[]) : [value]
  }, z.array(schema))

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app
    .get(
      '/',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
      },
      async (_request, reply) => {
        await reply.status(200).html(GamesPage())
      },
    )
    .get(
      '/whitelist-id',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
        schema: {
          querystring: z.object({
            gamemode: z.enum(Gamemode).default(defaultGamemode),
          }),
        },
      },
      async (request, reply) => {
        await reply.status(200).html(WhitelistId({ gamemode: request.query.gamemode }))
      },
    )
    .post(
      '/',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
        schema: {
          body: z
            .object({
              whitelistId: z.string(),
              whitelistGamemode: z.enum(Gamemode).default(defaultGamemode),
              joinGameserverTimeout: z.coerce.number(),
              rejoinGameserverTimeout: z.coerce.number(),
              executeExtraCommands: z.string().transform(value => value.split('\n')),
              logsTfUploadMethod: z.enum(LogsTfUploadMethod),
              'banLength[]': formArray(z.coerce.number().min(0)),
              'banLengthUnit[]': formArray(z.enum(durationUnit.all)),
            })
            .refine(
              ({ 'banLength[]': length, 'banLengthUnit[]': unit }) => length.length === unit.length,
              { message: 'banLength[] and banLengthUnit[] must be of the same length' },
            ),
        },
      },
      async (request, reply) => {
        const actor = request.user!.player.steamId
        const cooldownLevels = request.body['banLength[]'].map((value, i) => ({
          level: i,
          banLengthMs: durationUnit.toMs(value, request.body['banLengthUnit[]'][i]!),
        }))
        await Promise.all([
          configuration.set(
            'games.whitelist_id',
            request.body.whitelistId,
            actor,
            request.body.whitelistGamemode,
          ),
          configuration.set(
            'games.join_gameserver_timeout',
            secondsToMilliseconds(request.body.joinGameserverTimeout),
            actor,
          ),
          configuration.set(
            'games.rejoin_gameserver_timeout',
            secondsToMilliseconds(request.body.rejoinGameserverTimeout),
            actor,
          ),
          configuration.set(
            'games.execute_extra_commands',
            request.body.executeExtraCommands,
            actor,
          ),
          configuration.set('games.logs_tf_upload_method', request.body.logsTfUploadMethod, actor),
          configuration.set('games.cooldown_levels', cooldownLevels, actor),
        ])
        requestContext.set('messages', { success: ['Configuration saved'] })
        await reply.status(200).html(GamesPage())
      },
    )
    .post(
      '/cooldown-level',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
      },
      async (_request, reply) => {
        return await reply.send(CooldownLevelEntry({ banLengthMs: 0 }))
      },
    )
})
