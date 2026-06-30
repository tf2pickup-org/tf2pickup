import z from 'zod'
import { PlayerGameList, PlayerPage } from '../../../players/views/html/player.page'
import { steamId64 } from '../../../shared/schemas/steam-id-64'
import { players } from '../../../players'
import { routes } from '../../../utils/routes'
import { tasks } from '../../../tasks'
import { shouldSyncEtf2lProfile } from '../../../etf2l/should-sync-etf2l-profile'
import { collections } from '../../../database/collections'
import { Gamemode } from '../../../shared/types/gamemode'
import { defaultGamemode } from '../../../shared/enabled-gamemodes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app
    .get(
      '/',
      {
        schema: {
          params: z.object({
            steamId: steamId64,
          }),
          querystring: z.object({
            gamespage: z.coerce.number().optional(),
            gamemode: z.enum(Gamemode).optional(),
          }),
        },
      },
      async (req, reply) => {
        const { steamId } = req.params
        const page = Number(req.query.gamespage) || 1
        const gamemode = req.query.gamemode ?? defaultGamemode

        const player = await players.bySteamId(steamId, [
          'steamId',
          'name',
          'joinedAt',
          'roles',
          'etf2lProfile',
          'twitchTvProfile',
          'avatar.large',
          'stats',
          'skill',
          'skillHistory',
          'verified',
          'bans',
          'elo',
          'etf2lProfileLastSyncedAt',
        ])

        if (shouldSyncEtf2lProfile(player)) {
          await tasks.schedule('etf2l:syncPlayerProfile', 0, { player: steamId })
        }

        await reply.html(
          req.isPartialFor('gameList') ? (
            <PlayerGameList steamId={steamId} page={page} />
          ) : (
            <PlayerPage player={player} page={page} gamemode={gamemode} />
          ),
        )
      },
    )
    .post(
      '/accept-rules',
      {
        schema: {
          params: z.object({
            steamId: steamId64,
          }),
        },
      },
      async (request, reply) => {
        await collections.players.updateOne(
          { steamId: request.params.steamId },
          { $set: { hasAcceptedRules: true } },
        )
        await reply.redirect('/')
      },
    )
})
