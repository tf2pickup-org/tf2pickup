import z from 'zod'
import { GameList, GameListPage } from '../../games/views/html/game-list.page'
import { routes } from '../../utils/routes'
import { Gamemode } from '../../shared/types/gamemode'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get(
    '/',
    {
      schema: {
        querystring: z.object({
          page: z.coerce.number().optional(),
          gamemode: z.union([z.enum(Gamemode), z.literal('all')]).optional(),
        }),
      },
    },
    async (request, reply) => {
      const page = Number(request.query.page) || 1
      const gamemode = request.query.gamemode ?? 'all'
      await reply.html(
        request.isPartialFor('gameList') ? (
          <GameList page={page} gamemode={gamemode} />
        ) : (
          <GameListPage page={page} gamemode={gamemode} />
        ),
      )
    },
  )
})
