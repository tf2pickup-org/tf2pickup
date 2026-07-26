import z from 'zod'
import { escapeRegExp } from 'es-toolkit'
import { PlayerRole } from '../../../database/models/player.model'
import { collections } from '../../../database/collections'
import { players } from '../../../players'
import { routes } from '../../../utils/routes'
import { steamId64 } from '../../../shared/schemas/steam-id-64'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { FlashMessage } from '../../../html/components/flash-message'
import {
  DeletePlayerCard,
  DeletePlayerDeleted,
  DeletePlayerPage,
  DeletePlayerResults,
  type DeletePlayerSummary,
} from '../../../admin/delete-player/views/html/delete-player.page'

const summaryProjection = { steamId: 1, name: 1, roles: 1, 'avatar.medium': 1 } as const

async function findPlayers(query: string): Promise<DeletePlayerSummary[]> {
  const filter = /^\d{17}$/.test(query)
    ? { steamId: query as SteamId64 }
    : { name: { $regex: escapeRegExp(query), $options: 'i' } }
  return await collections.players
    .find<DeletePlayerSummary>(filter, { projection: summaryProjection, limit: 100 })
    .toArray()
}

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app
    .get(
      '/',
      {
        config: { authorize: [PlayerRole.superUser] },
        schema: {
          querystring: z.object({
            q: z.string().optional(),
          }),
        },
      },
      async (request, reply) => {
        const trimmed = request.query.q?.trim()
        const query = trimmed === undefined || trimmed === '' ? undefined : trimmed
        const results = query !== undefined ? await findPlayers(query) : undefined

        if (request.isPartialFor('delete-player-results')) {
          return reply.html(<DeletePlayerResults query={query} results={results} />)
        }
        return reply.html(<DeletePlayerPage query={query} results={results} />)
      },
    )
    .delete(
      '/:steamId',
      {
        config: { authorize: [PlayerRole.superUser] },
        schema: {
          params: z.object({ steamId: steamId64 }),
          // htmx 2 sends DELETE parameters in the query string, not the body.
          querystring: z.object({ confirmation: z.string().optional() }),
        },
      },
      async (request, reply) => {
        const { steamId } = request.params
        const confirmation = request.query.confirmation?.trim() ?? ''

        const player = await collections.players.findOne<DeletePlayerSummary>(
          { steamId },
          { projection: summaryProjection },
        )
        if (!player) {
          return reply.html(
            <>
              <DeletePlayerDeleted name={steamId} />
              <FlashMessage type="error" message="Player no longer exists." />
            </>,
          )
        }

        if (player.roles.includes(PlayerRole.superUser)) {
          return reply.html(
            <>
              <DeletePlayerCard player={player} />
              <FlashMessage type="error" message="Super-users cannot be deleted." />
            </>,
          )
        }

        if (confirmation !== player.name && confirmation !== player.steamId) {
          return reply.html(
            <>
              <DeletePlayerCard player={player} />
              <FlashMessage
                type="error"
                message="Confirmation does not match the player's nickname or Steam ID."
              />
            </>,
          )
        }

        await players.deletePlayer(steamId)
        return reply.html(
          <>
            <DeletePlayerDeleted name={player.name} />
            <FlashMessage type="success" message={`${player.name} has been deleted.`} />
          </>,
        )
      },
    )
})
