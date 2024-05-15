import fp from 'fastify-plugin'
import { Player } from './views/player'
import { SteamId64 } from '../shared/types/steam-id-64'

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(async app => {
  app.get<{
    Params: { steamId: SteamId64 }
  }>('/players/:steamId', async (req, reply) => {
    const { steamId } = req.params
    reply.status(200).html(await Player(steamId, req.user))
  })
})
