import { routes } from '../../../../utils/routes'
import { getState } from '../../../../queue/get-state'
import { getSlots } from '../../../../queue/get-slots'
import { getMapVoteResults } from '../../../../queue/get-map-vote-results'
import { queueConfigs } from '../../../../queue/configs'
import { environment } from '../../../../environment'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get('/', async (_req, reply) => {
    const [state, slots, mapVoteResults] = await Promise.all([
      getState(),
      getSlots(),
      getMapVoteResults(),
    ])

    const config = queueConfigs[environment.QUEUE_CONFIG]

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
  })
})
