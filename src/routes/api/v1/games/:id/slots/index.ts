import z from 'zod'
import { routes } from '../../../../../../utils/routes'
import { games } from '../../../../../../games'
import { collections } from '../../../../../../database/collections'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get(
    '/',
    {
      schema: {
        params: z.object({ id: games.schemas.gameNumber }),
      },
    },
    async (request, reply) => {
      const game = await games.findOne({ number: request.params.id })

      const steamIds = game.slots.map(s => s.player)
      const playerDocs = await collections.players
        .find({ steamId: { $in: steamIds } }, { projection: { steamId: 1, name: 1 } })
        .toArray()
      const playerMap = new Map(playerDocs.map(p => [p.steamId, p]))

      const slots = game.slots.map(slot => {
        const p = playerMap.get(slot.player)
        return {
          id: slot.id,
          player: {
            steamId: slot.player,
            name: p?.name ?? null,
            _links: { self: { href: `/api/v1/players/${slot.player}` } },
          },
          team: slot.team,
          gameClass: slot.gameClass,
          status: slot.status,
          connectionStatus: slot.connectionStatus,
        }
      })

      return reply
        .type('application/hal+json')
        .status(200)
        .send({
          _links: {
            self: { href: `/api/v1/games/${game.number}/slots` },
            game: { href: `/api/v1/games/${game.number}` },
          },
          _embedded: { slots },
        })
    },
  )
})
