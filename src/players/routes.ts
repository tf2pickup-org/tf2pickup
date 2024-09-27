import fp from 'fastify-plugin'
import { PlayerListPage } from './views/html/player-list.page'
import { PlayerPage } from './views/html/player.page'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { steamId64 } from '../shared/schemas/steam-id-64'
import {
  EditPlayerBansPage,
  EditPlayerProfilePage,
  EditPlayerSkillPage,
} from './views/html/edit-player.page'
import { collections } from '../database/collections'
import { PlayerRole } from '../database/models/player.model'
import { update } from './update'
import { Tf2ClassName } from '../shared/types/tf2-class-name'
import { PlayerSettingsPage } from './views/html/player-settings.page'
import { AddBanPage } from './views/html/add-ban.page'
import { banExpiryFormSchema } from './schemas/ban-expiry-form.schema'
import { format } from 'date-fns'
import { getBanExpiryDate } from './get-ban-expiry-date'
import { addBan } from './add-ban'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    app.get('/players', async (req, reply) => {
      reply.status(200).html(await PlayerListPage(req.user))
    })

    app
      .withTypeProvider<ZodTypeProvider>()
      .get(
        '/players/:steamId',
        {
          schema: {
            params: z.object({
              steamId: steamId64,
            }),
            querystring: z.object({
              gamespage: z.coerce.number().optional(),
            }),
          },
        },
        async (req, reply) => {
          const { steamId } = req.params
          const player = await collections.players.findOne({ steamId })
          if (!player) {
            return reply.notFound(`player not found: ${steamId}`)
          }
          reply.status(200).html(
            await PlayerPage({
              player,
              user: req.user,
              page: Number(req.query.gamespage) || 1,
            }),
          )
        },
      )
      .get(
        '/players/:steamId/edit',
        {
          config: {
            authorize: [PlayerRole.admin],
          },
          schema: {
            params: z.object({
              steamId: steamId64,
            }),
          },
        },
        async (req, reply) => {
          const { steamId } = req.params
          const player = await collections.players.findOne({ steamId })
          if (player === null) {
            return reply.notFound(`player not found: ${steamId}`)
          }

          await reply.redirect(`/players/${steamId}/edit/profile`)
        },
      )
      .get(
        '/players/:steamId/edit/profile',
        {
          config: {
            authorize: [PlayerRole.admin],
          },
          schema: {
            params: z.object({
              steamId: steamId64,
            }),
          },
        },
        async (req, reply) => {
          const { steamId } = req.params
          const player = await collections.players.findOne({ steamId })
          if (player === null) {
            return reply.notFound(`player not found: ${steamId}`)
          }

          reply.status(200).html(await EditPlayerProfilePage({ player, user: req.user! }))
        },
      )
      .post(
        '/players/:steamId/edit/profile',
        {
          config: {
            authorize: [PlayerRole.admin],
          },
          schema: {
            params: z.object({
              steamId: steamId64,
            }),
            body: z.object({
              name: z.string(),
            }),
          },
        },
        async (req, reply) => {
          const { steamId } = req.params
          const { name } = req.body
          const player = await collections.players.findOne({ steamId })
          if (player === null) {
            return reply.notFound(`player not found: ${steamId}`)
          }

          await update(player.steamId, { $set: { name } })
          req.flash('success', `Player updated`)
          await reply.redirect(`/players/${steamId}`)
        },
      )
      .get(
        '/players/:steamId/edit/skill',
        {
          config: {
            authorize: [PlayerRole.admin],
          },
          schema: {
            params: z.object({
              steamId: steamId64,
            }),
          },
        },
        async (req, reply) => {
          const { steamId } = req.params
          const player = await collections.players.findOne({ steamId })
          if (player === null) {
            return reply.notFound(`player not found: ${steamId}`)
          }

          reply.status(200).html(await EditPlayerSkillPage({ player, user: req.user! }))
        },
      )
      .post(
        '/players/:steamId/edit/skill',
        {
          config: {
            authorize: [PlayerRole.admin],
          },
          schema: {
            params: z.object({
              steamId: steamId64,
            }),
            body: z.object(
              Object.keys(Tf2ClassName).reduce<
                Partial<Record<`skill.${Tf2ClassName}`, z.ZodNumber>>
              >((acc, key) => ({ ...acc, [`skill.${key}`]: z.coerce.number().optional() }), {}),
            ),
          },
        },
        async (req, reply) => {
          const { steamId } = req.params
          const skill = Object.entries(req.body).reduce<Partial<Record<Tf2ClassName, number>>>(
            (acc, [key, value]) => ({ ...acc, [key.split('.')[1] as Tf2ClassName]: value }),
            {},
          )
          const player = await collections.players.findOne({ steamId })
          if (player === null) {
            return reply.notFound(`player not found: ${steamId}`)
          }

          await update(player.steamId, { $set: { skill } })
          req.flash('success', `Player skill updated`)
          await reply.redirect(`/players/${steamId}`)
        },
      )
      .get(
        '/players/:steamId/edit/bans',
        {
          config: {
            authorize: [PlayerRole.admin],
          },
          schema: {
            params: z.object({
              steamId: steamId64,
            }),
          },
        },
        async (req, reply) => {
          const { steamId } = req.params
          const player = await collections.players.findOne({ steamId })
          if (player === null) {
            return reply.notFound(`player not found: ${steamId}`)
          }

          reply.status(200).html(await EditPlayerBansPage({ player, user: req.user! }))
        },
      )
      .get(
        '/players/ban-expiry',
        {
          schema: {
            querystring: banExpiryFormSchema,
          },
        },
        async (request, reply) => {
          const banExpiryDate = getBanExpiryDate(request.query)
          reply.status(200).html(format(banExpiryDate, 'dd.MM.yyyy HH:mm'))
        },
      )
      .get(
        '/players/:steamId/edit/bans/add',
        {
          config: {
            authorize: [PlayerRole.admin],
          },
          schema: {
            params: z.object({
              steamId: steamId64,
            }),
          },
        },
        async (request, reply) => {
          const { steamId } = request.params
          const player = await collections.players.findOne({ steamId })
          if (player === null) {
            return reply.notFound(`player not found: ${steamId}`)
          }
          reply.status(200).html(await AddBanPage({ player, user: request.user! }))
        },
      )
      .post(
        '/players/:steamId/edit/bans/add',
        {
          config: {
            authorize: [PlayerRole.admin],
          },
          schema: {
            params: z.object({
              steamId: steamId64,
            }),
            body: z.intersection(
              banExpiryFormSchema,
              z.object({
                reason: z.string(),
              }),
            ),
          },
        },
        async (request, reply) => {
          await addBan({
            player: request.params.steamId,
            admin: request.user!.player.steamId,
            end: getBanExpiryDate(request.body),
            reason: request.body.reason,
          })
          request.flash('success', `Player ban added`)
          reply.redirect(`/players/${request.params.steamId}/edit/bans`)
        },
      )
      .get(
        '/settings',
        {
          config: {
            authenticate: true,
          },
        },
        async (req, reply) => {
          reply.status(200).html(await PlayerSettingsPage({ user: req.user! }))
        },
      )
      .post(
        '/settings',
        {
          config: {
            authenticate: true,
          },
          schema: {
            body: z.object({
              soundVolume: z.coerce.number().min(0).max(1),
            }),
          },
        },
        async (req, reply) => {
          const player = await collections.players.findOne({ steamId: req.user!.player.steamId })
          if (!player) {
            throw new Error(`player not found: ${req.user!.player.steamId}`)
          }
          const preferences =
            (await collections.playerPreferences.findOne({ player: player._id }))?.preferences ?? {}
          preferences.soundVolume = req.body.soundVolume.toString()
          await collections.playerPreferences.updateOne(
            { player: player._id },
            {
              $set: {
                preferences,
              },
            },
          )
          req.flash('success', `Settings saved`)
          await reply.redirect(`/settings`)
        },
      )
  },
  { name: 'players routes' },
)
