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
import { parseMarkdown } from '../../../utils/parse-markdown'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app
    .get('/', async (_request, reply) => {
      await reply.html(<AnnouncementsPage />)
    })
    .post(
      '/',
      {
        schema: {
          body: z.object({
            body: z.string().min(1),
            enabled: z
              .string()
              .optional()
              .transform(val => val === 'true'),
          }),
        },
      },
      async (request, reply) => {
        const now = new Date()
        await collections.announcements.insertOne({
          body: await parseMarkdown(request.body.body),
          originalBody: request.body.body,
          enabled: request.body.enabled,
          createdAt: now,
          updatedAt: now,
        })
        await reply.html(
          <>
            <AnnouncementsPage />
            <FlashMessage type="success" message="Announcement created" />
          </>,
        )
      },
    )
    .get(
      '/:id/edit',
      {
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
        schema: {
          params: z.object({
            id: z.string().regex(/^[0-9a-fA-F]{24}$/),
          }),
          body: z.object({
            body: z.string().min(1),
            enabled: z
              .string()
              .optional()
              .transform(val => val === 'true'),
          }),
        },
      },
      async (request, reply) => {
        const result = await collections.announcements.findOneAndUpdate(
          { _id: new ObjectId(request.params.id) },
          {
            $set: {
              body: await parseMarkdown(request.body.body),
              originalBody: request.body.body,
              enabled: request.body.enabled,
              updatedAt: new Date(),
            },
          },
          { returnDocument: 'after' },
        )
        if (!result) {
          throw errors.notFound('Announcement not found')
        }
        await reply.html(
          <>
            <AnnouncementEntry announcement={result} />
            <FlashMessage type="success" message="Announcement updated" />
          </>,
        )
      },
    )
    .post(
      '/:id/toggle',
      {
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
        await reply.html(
          <>
            <AnnouncementEntry announcement={result} />
            <FlashMessage
              type="success"
              message={result.enabled ? 'Announcement enabled' : 'Announcement disabled'}
            />
          </>,
        )
      },
    )
    .delete(
      '/:id',
      {
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
        await reply.html(
          <>
            <FlashMessage type="success" message="Announcement deleted" />
          </>,
        )
        // reply.status(200).send('')
      },
    )
})
