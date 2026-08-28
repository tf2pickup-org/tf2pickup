import { routes } from '../../../../utils/routes'
import { enabledGamemodes } from '../../../../shared/enabled-gamemodes'
import { defaultGamemode } from '../../../../shared/default-gamemode'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get('/', async (_req, reply) => {
    return reply
      .type('application/hal+json')
      .status(200)
      .send({
        default: defaultGamemode,
        gamemodes: enabledGamemodes.map(gamemode => ({
          name: gamemode,
          _links: { queue: { href: `/api/v1/${gamemode}/queue` } },
        })),
        _links: { self: { href: '/api/v1/gamemodes' } },
      })
  })
})
