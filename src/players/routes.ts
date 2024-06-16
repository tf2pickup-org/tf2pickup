import fp from 'fastify-plugin'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { PlayerListPage } from './views/html/player-list.page'
import { PlayerPage } from './views/html/player.page'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    app.get('/players', async (req, reply) => {
      reply.status(200).html(await PlayerListPage(req.user))
    })

    app.get<{
      Params: { steamId: SteamId64 }
    }>('/players/:steamId', async (req, reply) => {
      const { steamId } = req.params
      reply.status(200).html(await PlayerPage(steamId, req.user))
    })
  },
  { name: 'players routes' },
)
