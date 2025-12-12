import { PlayerRole } from '../../../database/models/player.model'
import {
  AnnouncementEditForm,
  AnnouncementEntry,
  AnnouncementsPage,
} from '../../../admin/announcements/views/html/announcements.page'
import { z } from 'zod'
import { collections } from '../../../database/collections'
import { routes } from '../../../utils/routes'
import { ObjectId } from 'mongodb'
import { errors } from '../../../errors'
import { FlashMessage } from '../../../html/components/flash-message'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app
    .get(
      '/',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
      },
      async (_request, reply) => {
        await reply.html(<AnnouncementsPage />)
      },
    )
    .post(
      '/',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
        schema: {
          body: z.object({
            body: z.string().min(1),
            enabled: z.string().optional().transform(val => val === 'true'),
          }),
        },
      },
      async (request, reply) => {
        const now = new Date()
        await collections.announcements.insertOne({
          body: request.body.body,
          enabled: request.body.enabled,
          createdAt: now,
          updatedAt: now,
        })
        await reply.html(<>
          <AnnouncementsPage />
          <FlashMessage type="success" message="Announcement created" />
        </>)
      },
    )
    .get(
      '/:id/edit',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
        schema: {
          params: z.object({
            id: z.string().regex(/^[0-9a-fA-F]{24}$/),
          }),
        },
      },
      async (request, reply) => {
        const announcement = await collections.announcements.findOne({
          _id: new ObjectId(request.params.id),
        })
        if (!announcement) {
          throw errors.notFound('Announcement not found')
        }
        await reply.html(<AnnouncementEditForm announcement={announcement} />)
      },
    )
    .get(
      '/:id/cancel',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
        schema: {
          params: z.object({
            id: z.string().regex(/^[0-9a-fA-F]{24}$/),
          }),
        },
      },
      async (request, reply) => {
        const announcement = await collections.announcements.findOne({
          _id: new ObjectId(request.params.id),
        })
        if (!announcement) {
          throw errors.notFound('Announcement not found')
        }
        await reply.html(<AnnouncementEntry announcement={announcement} />)
      },
    )
    .post(
      '/:id',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
        schema: {
          params: z.object({
            id: z.string().regex(/^[0-9a-fA-F]{24}$/),
          }),
          body: z.object({
            body: z.string().min(1),
            enabled: z.string().optional().transform(val => val === 'true'),
          }),
        },
      },
      async (request, reply) => {
        const result = await collections.announcements.findOneAndUpdate(
          { _id: new ObjectId(request.params.id) },
          {
            $set: {
              body: request.body.body,
              enabled: request.body.enabled,
              updatedAt: new Date(),
            },
          },
          { returnDocument: 'after' },
        )
        if (!result) {
          throw errors.notFound('Announcement not found')
        }
        await reply.html(<>
          <AnnouncementEntry announcement={result} />
          <FlashMessage type="success" message="Announcement updated" />
        </>)
      },
    )
    .post(
      '/:id/toggle',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
        schema: {
          params: z.object({
            id: z.string().regex(/^[0-9a-fA-F]{24}$/),
          }),
        },
      },
      async (request, reply) => {
        const announcement = await collections.announcements.findOne({
          _id: new ObjectId(request.params.id),
        })
        if (!announcement) {
          throw errors.notFound('Announcement not found')
        }
        const result = await collections.announcements.findOneAndUpdate(
          { _id: new ObjectId(request.params.id) },
          {
            $set: {
              enabled: !announcement.enabled,
              updatedAt: new Date(),
            },
          },
          { returnDocument: 'after' },
        )
        if (!result) {
          throw errors.notFound('Announcement not found')
        }
        await reply.html(<>
          <AnnouncementEntry announcement={result} />
          <FlashMessage type="success" message={result.enabled ? 'Announcement enabled' : 'Announcement disabled'} />
        </>)
      },
    )
    .delete(
      '/:id',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
        schema: {
          params: z.object({
            id: z.string().regex(/^[0-9a-fA-F]{24}$/),
          }),
        },
      },
      async (request, reply) => {
        const result = await collections.announcements.deleteOne({
          _id: new ObjectId(request.params.id),
        })
        if (result.deletedCount === 0) {
          throw errors.notFound('Announcement not found')
        }
        await reply.html(<>
          <AnnouncementsPage />
          <FlashMessage type="success" message="Announcement deleted" />
        </>)
        reply.status(200).send('')
      },
    )
})

