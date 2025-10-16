import z from 'zod'
import { GamePage } from '../../../games/views/html/game.page'
import { games } from '../../../games'
import { PlayerRole } from '../../../database/models/player.model'
import { steamId64 } from '../../../shared/schemas/steam-id-64'
import { gameServers } from '../../../game-servers'
import { routes } from '../../../utils/routes'

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
        const game = await games.findOne({ number })
        reply.status(200).html(await GamePage({ game, user: request.user }))
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
        await games.requestGameServerReinitialization(
          request.params.number,
          request.user!.player.steamId,
        )
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
            gameServer: z.string(),
          }),
        },
      },
      async (request, reply) => {
        const { number } = request.params
        const { gameServer } = request.body
        const game = await games.findOne({ number })
        await gameServers.assign(game, gameServer)
        await reply
          .status(204)
          .header('HX-Trigger', JSON.stringify({ close: { target: '#choose-game-server-dialog' } }))
          .send()
      },
    )
})
