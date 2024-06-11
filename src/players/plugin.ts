import fp from 'fastify-plugin'
import { PlayerPage } from './views/html/player.page'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { events } from '../events'
import { GoToGame } from './views/html/go-to-game'
import { PlayerListPage } from './views/html/player-list.page'

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(async app => {
  events.on('player:updated', ({ before, after }) => {
    // redirect player to the new game
    if (before.activeGame === undefined && after.activeGame !== undefined) {
      app.gateway.toPlayers(after.steamId).broadcast(async () => await GoToGame(after.activeGame!))
    }
  })

  app.get('/players', async (_req, reply) => {
    reply.status(200).html(await PlayerListPage())
  })

  app.get<{
    Params: { steamId: SteamId64 }
  }>('/players/:steamId', async (req, reply) => {
    const { steamId } = req.params
    reply.status(200).html(await PlayerPage(steamId, req.user))
  })
})
