import { z } from 'zod'

export const getStreamsResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      user_id: z.string(),
      user_login: z.string(),
      user_name: z.string(),
      game_id: z.string(),
      game_name: z.string(),
      type: z.enum(['live']),
      title: z.string(),
      tags: z.array(z.string()),
      viewer_count: z.number(),
      started_at: z.string(),
      language: z.string(),
      thumbnail_url: z.string(),
      tag_ids: z.array(z.string()),
      is_mature: z.boolean(),
    }),
  ),
  pagination: z.object({
    cursor: z.string().optional(),
  }),
})
