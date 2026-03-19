import z from 'zod'
import { GamePage } from '../../../games/views/html/game.page'
import { games } from '../../../games'
import { PlayerRole } from '../../../database/models/player.model'
import { steamId64 } from '../../../shared/schemas/steam-id-64'
import { routes } from '../../../utils/routes'
import { tf2QuickServer } from '../../../tf2-quick-server'
import { configuration } from '../../../configuration'
import { Tf2QuickServerList } from '../../../tf2-quick-server/views/html/tf2-quick-server-list'
import { logger } from '../../../logger'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app
    .get(
      '/',
      {
        schema: {
          params: z.object({
            number: games.schemas.gameNumber,
          }),
        },
      },
      async (request, reply) => {
        const { number } = request.params
        await reply.html(GamePage({ number }))
      },
    )
    .put(
      '/request-substitute',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
        schema: {
          params: z.object({
            number: games.schemas.gameNumber,
          }),
          body: z.object({
            player: steamId64,
          }),
        },
      },
      async (request, reply) => {
        const number = request.params.number
        const replacee = request.body.player

        await games.requestSubstitute({ number, replacee, actor: request.user!.player.steamId })
        await reply.status(204).send()
      },
    )
    .put(
      '/replace-player',
      {
        config: {
          authenticate: true,
        },
        schema: {
          params: z.object({
            number: games.schemas.gameNumber,
          }),
          body: z.object({
            player: steamId64,
          }),
        },
      },
      async (request, reply) => {
        const number = request.params.number
        const replacee = request.body.player
        const replacement = request.user!.player.steamId

        await games.replacePlayer({ number, replacee, replacement })
        await reply.status(204).send()
      },
    )
    .put(
      '/force-end',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
        schema: {
          params: z.object({
            number: games.schemas.gameNumber,
          }),
        },
      },
      async (request, reply) => {
        await games.forceEnd(request.params.number, request.user!.player.steamId)
        await reply.status(204).send()
      },
    )
    .put(
      '/reinitialize-gameserver',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
        schema: {
          params: z.object({
            number: games.schemas.gameNumber,
          }),
        },
      },
      async (request, reply) => {
        await games.reinitializeGameServer(request.params.number, request.user!.player.steamId)
        await reply.status(204).send()
      },
    )
    .put(
      '/reassign-gameserver',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
        schema: {
          params: z.object({ number: games.schemas.gameNumber }),
          body: z.object({
            gameServer: z.preprocess(val => {
              try {
                return JSON.parse(val as string) as unknown
              } catch {
                throw new Error('gameServer must be valid JSON')
              }
            }, games.schemas.gameServerSelection),
          }),
        },
      },
      async (request, reply) => {
        const { number } = request.params
        const { gameServer } = request.body
        await games.assignGameServer(number, {
          selected: gameServer,
          actor: request.user!.player.steamId,
        })
        // Fire-and-forget: configure() handles its own errors internally.
        // This catch only covers errors that escape before configure() starts (e.g. findOne failure).
        games.configure(number).catch((error: unknown) => {
          logger.error(
            { error },
            'PUT /games/:number/reassign-gameserver: configure() failed to start',
          )
        })
        await reply
          .trigger({ close: { target: '#choose-game-server-dialog' } })
          .status(204)
          .send()
      },
    )
    .get(
      '/tf2-quick-server-list',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
        schema: {
          params: z.object({ number: games.schemas.gameNumber }),
        },
      },
      async (_request, reply) => {
        try {
          const servers = await tf2QuickServer.listFree()
          const defaultRegion = await configuration.get('tf2_quick_server.region')
          await reply.html(Tf2QuickServerList({ servers, defaultRegion }))
        } catch (error) {
          logger.error(error)
          await reply.html(
            <span class="text-red-400">Failed to load TF2 Quick Servers. Please try again.</span>,
          )
        }
      },
    )
})
