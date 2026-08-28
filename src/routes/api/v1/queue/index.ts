import { z } from 'zod'
import { routes } from '../../../../utils/routes'
import { getState } from '../../../../queue/get-state'
import { getSlots } from '../../../../queue-auto/get-slots'
import { getMapVoteResults } from '../../../../queue-auto/get-map-vote-results'
import { getQueueConfig } from '../../../../queue-auto/configs'
import { Gamemode } from '../../../../shared/types/gamemode'
import { defaultGamemode } from '../../../../shared/default-gamemode'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get(
    '/',
    {
      schema: {
        querystring: z.object({
          gamemode: z.enum(Gamemode).default(defaultGamemode),
        }),
      },
    },
    async (req, reply) => {
      const { gamemode } = req.query
      const [state, slots, mapVoteResults] = await Promise.all([
        getState(gamemode),
        getSlots(gamemode),
        getMapVoteResults(gamemode),
      ])

      const config = getQueueConfig(gamemode)

      return reply
        .type('application/hal+json')
        .status(200)
        .send({
          state,
          config: {
            teamCount: config.teamCount,
            classes: config.classes.map(c => ({
              name: c.name,
              count: c.count,
              ...(c.canMakeFriendsWith ? { canMakeFriendsWith: c.canMakeFriendsWith } : {}),
            })),
          },
          slots: slots.map(slot => ({
            id: slot.id,
            gameClass: slot.gameClass,
            player: slot.player
              ? {
                  steamId: slot.player.steamId,
                  name: slot.player.name,
                  avatarUrl: slot.player.avatarUrl,
                }
              : null,
            ready: slot.ready,
          })),
          mapVoteResults,
          _links: { self: { href: '/api/v1/queue' } },
        })
    },
  )
})
